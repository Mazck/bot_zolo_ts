import { GroupSubscription, LicenseKey, Group } from '../entities';
import { DatabaseService } from '../index';
import { LessThan, MoreThan, Equal, In, Between } from 'typeorm';
import global from '../../global';
import { groupService } from './index';
import crypto from 'crypto';

/**
 * Generate a random key for licenses
 * @param length Length of the key
 * @returns Random alphanumeric string
 */
function generateRandomKey(length: number = 16): string {
    return crypto.randomBytes(length)
        .toString('base64')
        .replace(/[+/=]/g, '')  // Remove non-alphanumeric characters
        .substring(0, length);   // Ensure exact length
}

/**
 * Subscription service for database operations
 */
export class SubscriptionService extends DatabaseService<GroupSubscription> {
    private licenseRepository: DatabaseService<LicenseKey>;

    constructor() {
        super(GroupSubscription);
        this.licenseRepository = new DatabaseService<LicenseKey>(LicenseKey);
    }

    /**
     * Creates a new subscription for a group
     */
    async createSubscription(
        groupId: string,
        userId: string,
        durationDays: number,
        keys: string[] = []
    ): Promise<GroupSubscription | null> {
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + durationDays);

            const subscription = this.getRepository().create({
                groupId,
                activatedBy: userId,
                startDate,
                endDate,
                isActive: true,
                keysUsed: keys
            });

            const savedSubscription = await this.getRepository().save(subscription);

            // Activate the group
            await groupService().activateGroup(groupId, durationDays);

            // Mark license keys as used
            if (keys.length > 0) {
                await this.markLicenseKeysAsUsed(keys, userId);
            }

            return savedSubscription;
        } catch (error) {
            global.logger.error(`Error creating subscription: ${error}`);
            return null;
        }
    }

    /**
     * Extends an existing subscription
     */
    async extendSubscription(
        groupId: string,
        userId: string,
        durationDays: number,
        keys: string[] = []
    ): Promise<GroupSubscription | null> {
        try {
            // Find current subscription
            const currentSubscription = await this.findActiveSubscription(groupId);

            if (currentSubscription) {
                // Calculate new end date
                const newEndDate = new Date(currentSubscription.endDate);
                newEndDate.setDate(newEndDate.getDate() + durationDays);

                // Update subscription
                currentSubscription.endDate = newEndDate;
                // Use the setter for keysUsed which will update keysUsedJson
                currentSubscription.keysUsed = [
                    ...currentSubscription.keysUsed,
                    ...keys
                ];

                const updatedSubscription = await this.getRepository().save(currentSubscription);

                // Activate the group with new duration
                await groupService().activateGroup(groupId, durationDays);

                // Mark license keys as used
                if (keys.length > 0) {
                    await this.markLicenseKeysAsUsed(keys, userId);
                }

                return updatedSubscription;
            } else {
                // Create new subscription if none exists
                return await this.createSubscription(groupId, userId, durationDays, keys);
            }
        } catch (error) {
            global.logger.error(`Error extending subscription: ${error}`);
            return null;
        }
    }

    /**
     * Finds active subscription for a group
     */
    async findActiveSubscription(groupId: string): Promise<GroupSubscription | null> {
        try {
            const now = new Date();

            return await this.findOneBy({
                groupId,
                isActive: true,
                endDate: MoreThan(now)
            });
        } catch (error) {
            global.logger.error(`Error finding active subscription: ${error}`);
            return null;
        }
    }

    /**
     * Gets all subscriptions for a group
     */
    async getGroupSubscriptions(groupId: string): Promise<GroupSubscription[]> {
        try {
            return await this.findBy({
                groupId
            });
        } catch (error) {
            global.logger.error(`Error getting group subscriptions: ${error}`);
            return [];
        }
    }

    /**
     * Gets all active subscriptions
     */
    async getAllActiveSubscriptions(): Promise<GroupSubscription[]> {
        try {
            const now = new Date();

            return await this.findBy({
                isActive: true,
                endDate: MoreThan(now)
            });
        } catch (error) {
            global.logger.error(`Error getting all active subscriptions: ${error}`);
            return [];
        }
    }

    /**
     * Gets subscriptions expiring soon
     */
    async getSubscriptionsExpiringSoon(
        daysThreshold: number = 3
    ): Promise<GroupSubscription[]> {
        try {
            const now = new Date();
            const thresholdDate = new Date();
            thresholdDate.setDate(now.getDate() + daysThreshold);

            return await this.getRepository().find({
                where: {
                    isActive: true,
                    endDate: Between(now, thresholdDate)
                },
                relations: ['group']
            });
        } catch (error) {
            global.logger.error(`Error getting subscriptions expiring soon: ${error}`);
            return [];
        }
    }

    /**
     * Deactivates expired subscriptions
     */
    async deactivateExpiredSubscriptions(): Promise<number> {
        try {
            const now = new Date();

            const expiredSubscriptions = await this.findBy({
                isActive: true,
                endDate: LessThan(now)
            });

            let deactivatedCount = 0;

            for (const subscription of expiredSubscriptions) {
                subscription.isActive = false;
                await this.getRepository().save(subscription);

                // Deactivate the group as well
                await groupService().deactivateGroup(subscription.groupId);

                deactivatedCount++;
            }

            return deactivatedCount;
        } catch (error) {
            global.logger.error(`Error deactivating expired subscriptions: ${error}`);
            return 0;
        }
    }

    // === LICENSE KEY MANAGEMENT ===

    /**
     * Generates a new license key
     */
    async generateLicenseKey(
        duration: number,
        durationType: string,
        createdBy?: string
    ): Promise<LicenseKey | null> {
        try {
            // Generate a unique key
            const key = `${durationType.toUpperCase()}-${duration}-${generateRandomKey(16)}`;

            // Calculate expiration date
            const expiresAt = new Date();

            // Determine duration in days
            let durationDays = duration;
            switch (durationType.toLowerCase()) {
                case 'day':
                    durationDays = duration;
                    break;
                case 'week':
                    durationDays = duration * 7;
                    break;
                case 'month':
                    durationDays = duration * 30;
                    break;
                case 'year':
                    durationDays = duration * 365;
                    break;
                // 'custom' uses the provided duration directly
            }

            expiresAt.setDate(expiresAt.getDate() + durationDays);

            // Create license key using findBy instead of direct repository access
            // Since getRepository is protected, we need to go through a public method
            const licenseKeyData = {
                key,
                duration,
                durationType,
                isUsed: false,
                createdBy,
                expiresAt
            };

            // Create and save using method that uses this.getRepository internally
            return await this.createLicenseKey(licenseKeyData);
        } catch (error) {
            global.logger.error(`Error generating license key: ${error}`);
            return null;
        }
    }

    /**
     * Helper method to create a license key
     */
    private async createLicenseKey(data: Partial<LicenseKey>): Promise<LicenseKey | null> {
        try {
            // We're not directly accessing licenseRepository.getRepository here
            // Instead we'll use the public methods of DatabaseService

            // First create a license key entity
            const licenseKey = new LicenseKey();
            Object.assign(licenseKey, data);

            // Then use our findBy method to access the repository indirectly
            return await this.saveLicenseKey(licenseKey);
        } catch (error) {
            global.logger.error(`Error creating license key: ${error}`);
            return null;
        }
    }

    /**
     * Helper method to save a license key
     */
    private async saveLicenseKey(licenseKey: LicenseKey): Promise<LicenseKey> {
        try {
            // We need to access the repository through our own getRepository method
            return await this.getRepository().manager.save(licenseKey);
        } catch (error) {
            global.logger.error(`Error saving license key: ${error}`);
            throw error;
        }
    }

    /**
     * Generates multiple license keys
     */
    async generateMultipleLicenseKeys(
        count: number,
        duration: number,
        durationType: string,
        createdBy?: string
    ): Promise<LicenseKey[]> {
        try {
            const keys: LicenseKey[] = [];

            for (let i = 0; i < count; i++) {
                const key = await this.generateLicenseKey(duration, durationType, createdBy);
                if (key) keys.push(key);
            }

            return keys;
        } catch (error) {
            global.logger.error(`Error generating multiple license keys: ${error}`);
            return [];
        }
    }

    /**
     * Finds a license key by its key
     */
    async findLicenseKey(key: string): Promise<LicenseKey | null> {
        try {
            // Use the entity manager to access LicenseKey entity
            return await this.getRepository().manager.findOne(LicenseKey, {
                where: { key }
            });
        } catch (error) {
            global.logger.error(`Error finding license key: ${error}`);
            return null;
        }
    }

    /**
     * Marks license keys as used
     */
    async markLicenseKeysAsUsed(
        keys: string[],
        usedBy: string
    ): Promise<number> {
        try {
            const now = new Date();
            let usedCount = 0;

            // Find license keys to update
            const licenseKeys = await this.getRepository().manager.find(LicenseKey, {
                where: {
                    key: In(keys),
                    isUsed: false
                }
            });

            // Update each key
            for (const licenseKey of licenseKeys) {
                licenseKey.isUsed = true;
                licenseKey.usedBy = usedBy;
                licenseKey.usedAt = now;

                await this.getRepository().manager.save(LicenseKey, licenseKey);
                usedCount++;
            }

            return usedCount;
        } catch (error) {
            global.logger.error(`Error marking license keys as used: ${error}`);
            return 0;
        }
    }

    /**
     * Gets unused license keys
     */
    async getUnusedLicenseKeys(): Promise<LicenseKey[]> {
        try {
            return await this.getRepository().manager.find(LicenseKey, {
                where: { isUsed: false }
            });
        } catch (error) {
            global.logger.error(`Error getting unused license keys: ${error}`);
            return [];
        }
    }

    /**
     * Verifies and uses a license key
     */
    async useKey(
        key: string,
        groupId: string,
        userId: string
    ): Promise<{ success: boolean; message: string; days?: number }> {
        try {
            // Find the license key
            const licenseKey = await this.findLicenseKey(key);

            if (!licenseKey) {
                return { success: false, message: 'Không tìm thấy mã kích hoạt này' };
            }

            if (licenseKey.isUsed) {
                return { success: false, message: 'Mã kích hoạt này đã được sử dụng' };
            }

            // Calculate duration in days
            let durationDays = licenseKey.duration;
            switch (licenseKey.durationType.toLowerCase()) {
                case 'week':
                    durationDays *= 7;
                    break;
                case 'month':
                    durationDays *= 30;
                    break;
                case 'year':
                    durationDays *= 365;
                    break;
            }

            // Check if key is expired
            if (licenseKey.expiresAt && licenseKey.expiresAt < new Date()) {
                return { success: false, message: 'Mã kích hoạt này đã hết hạn' };
            }

            // Mark key as used
            licenseKey.isUsed = true;
            licenseKey.usedBy = userId;
            licenseKey.usedAt = new Date();
            await this.getRepository().manager.save(LicenseKey, licenseKey);

            // Extend or create subscription
            await this.extendSubscription(groupId, userId, durationDays, [key]);

            return {
                success: true,
                message: 'Kích hoạt thành công',
                days: durationDays
            };
        } catch (error) {
            global.logger.error(`Error using license key: ${error}`);
            return { success: false, message: 'Lỗi xử lý mã kích hoạt' };
        }
    }
}