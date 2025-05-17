import { Group } from '../entities';
import { DatabaseService, getRepository } from '../index';
import { LessThan, MoreThan, IsNull, Not, Between, FindOperator } from 'typeorm';
import global from '../../global';

/**
 * Group service for database operations
 */
export class GroupService extends DatabaseService<Group> {
    constructor() {
        super(Group);
    }

    /**
     * Finds a group by Zalo group ID
     */
    async findGroupById(groupId: string): Promise<Group | null> {
        try {
            return await this.findOneBy({ id: groupId });
        } catch (error) {
            global.logger.error(`Error finding group by ID: ${error}`);
            return null;
        }
    }

    /**
     * Creates or updates a group
     */
    async createOrUpdateGroup(
        groupId: string,
        groupName: string
    ): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);

            // If group exists, update it
            if (group) {
                group.name = groupName;
                return await this.getRepository().save(group);
            }

            // Create new group
            const newGroup = this.getRepository().create({
                id: groupId,
                name: groupName,
                isActive: false
            });

            return await this.getRepository().save(newGroup);
        } catch (error) {
            global.logger.error(`Error creating/updating group: ${error}`);
            return null;
        }
    }

    /**
     * Activates a group with a specified duration
     */
    async activateGroup(
        groupId: string,
        durationDays: number
    ): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            const now = new Date();
            let expirationDate = new Date();

            // If group is already active and not expired, extend duration
            if (group.isActive && group.expiresAt && group.expiresAt > now) {
                expirationDate = new Date(group.expiresAt.getTime());
                expirationDate.setDate(expirationDate.getDate() + durationDays);
            } else {
                // Activate for the first time or reactivate expired group
                expirationDate.setDate(now.getDate() + durationDays);
                group.activatedAt = now;
            }

            group.isActive = true;
            group.expiresAt = expirationDate;

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error activating group: ${error}`);
            return null;
        }
    }

    /**
     * Deactivates a group
     */
    async deactivateGroup(groupId: string): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            group.isActive = false;

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error deactivating group: ${error}`);
            return null;
        }
    }

    /**
     * Checks if a group is active
     */
    async isGroupActive(groupId: string): Promise<boolean> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return false;

            const now = new Date();
            return group.isActive && !!group.expiresAt && group.expiresAt > now;
        } catch (error) {
            global.logger.error(`Error checking if group is active: ${error}`);
            return false;
        }
    }

    /**
     * Gets all expired groups
     */
    async getExpiredGroups(): Promise<Group[]> {
        try {
            const now = new Date();

            return await this.getRepository().find({
                where: {
                    isActive: true,
                    expiresAt: LessThan(now)
                }
            });
        } catch (error) {
            global.logger.error(`Error getting expired groups: ${error}`);
            return [];
        }
    }

    /**
     * Gets groups expiring soon
     */
    async getGroupsExpiringSoon(
        daysThreshold: number = 3
    ): Promise<Group[]> {
        try {
            const now = new Date();
            const thresholdDate = new Date();
            thresholdDate.setDate(now.getDate() + daysThreshold);

            // Use Between operator instead of multiple conditions on the same field
            return await this.getRepository().find({
                where: {
                    isActive: true,
                    expiresAt: Between(now, thresholdDate)
                }
            });
        } catch (error) {
            global.logger.error(`Error getting groups expiring soon: ${error}`);
            return [];
        }
    }

    /**
     * Gets all active groups
     */
    async getActiveGroups(): Promise<Group[]> {
        try {
            const now = new Date();

            return await this.getRepository().find({
                where: {
                    isActive: true,
                    expiresAt: MoreThan(now)
                }
            });
        } catch (error) {
            global.logger.error(`Error getting active groups: ${error}`);
            return [];
        }
    }

    /**
     * Bans a group
     */
    async banGroup(groupId: string, reason: string): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            group.banned = true;
            group.banReason = reason;

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error banning group: ${error}`);
            return null;
        }
    }

    /**
     * Unbans a group
     */
    async unbanGroup(groupId: string): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            group.banned = false;
            group.banReason = null;

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error unbanning group: ${error}`);
            return null;
        }
    }

    /**
     * Checks if a group is banned
     */
    async isGroupBanned(groupId: string): Promise<boolean> {
        try {
            const group = await this.findGroupById(groupId);
            return !!group && group.banned;
        } catch (error) {
            global.logger.error(`Error checking if group is banned: ${error}`);
            return false;
        }
    }

    /**
     * Updates group settings
     */
    async updateGroupSettings(
        groupId: string,
        settings: Record<string, any>
    ): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            // Merge new settings with existing ones
            group.settings = { ...group.settings, ...settings };

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error updating group settings: ${error}`);
            return null;
        }
    }

    /**
     * Updates group statistics after a message
     */
    async updateGroupStats(groupId: string, expGain: number = 1): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            // Update message count and exp
            group.messageCount += 1;
            group.exp += expGain;

            // Update level based on exp
            // Simple level formula: level = floor(sqrt(exp / 25)) + 1
            const newLevel = Math.floor(Math.sqrt(group.exp / 25)) + 1;
            if (newLevel > group.level) {
                group.level = newLevel;
                // Could trigger level-up events or rewards here
            }

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error updating group stats: ${error}`);
            return null;
        }
    }

    /**
     * Adds an admin to a group
     */
    async addGroupAdmin(groupId: string, userId: string): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            // Add admin if not already in the list
            if (!group.adminIds.includes(userId)) {
                group.adminIds = [...group.adminIds, userId];
            }

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error adding group admin: ${error}`);
            return null;
        }
    }

    /**
     * Removes an admin from a group
     */
    async removeGroupAdmin(groupId: string, userId: string): Promise<Group | null> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return null;

            // Remove admin from the list
            group.adminIds = group.adminIds.filter(id => id !== userId);

            return await this.getRepository().save(group);
        } catch (error) {
            global.logger.error(`Error removing group admin: ${error}`);
            return null;
        }
    }

    /**
     * Checks if a user is an admin of a group
     */
    async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
        try {
            const group = await this.findGroupById(groupId);
            if (!group) return false;

            return group.adminIds.includes(userId) || group.creatorId === userId;
        } catch (error) {
            global.logger.error(`Error checking if user is group admin: ${error}`);
            return false;
        }
    }
}