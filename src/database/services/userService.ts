import { User } from '../entities';
import { DatabaseService, getRepository } from '../index';
import { LessThan, MoreThan } from 'typeorm';
import { ADMIN_IDS } from '../../config';
import global from '../../global';

/**
 * User service for database operations
 */
export class UserService extends DatabaseService<User> {
    constructor() {
        super(User);
    }

    /**
     * Finds a user by Zalo ID
     */
    async findUserById(userId: string): Promise<User | null> {
        try {
            return await this.findOneBy({ id: userId });
        } catch (error) {
            global.logger.error(`Error finding user by ID: ${error}`);
            return null;
        }
    }

    /**
     * Creates or updates a user
     */
    async createOrUpdateUser(
        userId: string,
        userName: string,
        permission?: string
    ): Promise<User | null> {
        try {
            const user = await this.findUserById(userId);

            // If user exists, update it
            if (user) {
                user.displayName = userName;
                if (permission) {
                    user.permission = permission;
                }
                // Update last active time
                user.lastActive = new Date();
                return await this.getRepository().save(user);
            }

            // Check if user is in ADMIN_IDS
            const isAdmin = ADMIN_IDS.includes(userId);

            // Create new user
            const newUser = this.getRepository().create({
                id: userId,
                displayName: userName,
                username: userName,
                zaloName: userName,
                permission: isAdmin ? 'admin' : (permission || 'user'),
                lastActive: new Date()
            });

            return await this.getRepository().save(newUser);
        } catch (error) {
            global.logger.error(`Error creating/updating user: ${error}`);
            return null;
        }
    }

    /**
     * Updates user from Zalo API data
     * @param userId User ID
     * @param apiData API data from Zalo getUserInfo
     */
    async updateUserFromApiData(userId: string, apiData: any): Promise<User | null> {
        try {
            if (!apiData || !apiData.changed_profiles || !apiData.changed_profiles[userId]) {
                global.logger.warn(`No valid API data for user ${userId}`);
                return null;
            }

            const profile = apiData.changed_profiles[userId];
            let user = await this.findUserById(userId);

            if (!user) {
                // Create new user if it doesn't exist
                user = this.getRepository().create({
                    id: userId,
                    displayName: profile.displayName || profile.zaloName || `User_${userId.substring(0, 8)}`,
                    username: profile.username || '',
                    zaloName: profile.zaloName || '',
                    avatar: profile.avatar || '',
                    gender: profile.gender !== undefined ? profile.gender : null,
                    phoneNumber: profile.phoneNumber || '',
                    // Check if user is in ADMIN_IDS list
                    permission: ADMIN_IDS.includes(userId) ? 'admin' : 'user',
                    lastActive: new Date(profile.lastActionTime || Date.now())
                });
            } else {
                // Update existing user with API data
                user.displayName = profile.displayName || profile.zaloName || user.displayName;
                user.username = profile.username || user.username;
                user.zaloName = profile.zaloName || user.zaloName;
                user.avatar = profile.avatar || user.avatar;
                user.gender = profile.gender !== undefined ? profile.gender : user.gender;
                user.phoneNumber = profile.phoneNumber || user.phoneNumber;
                user.lastActive = new Date(profile.lastActionTime || Date.now());
            }

            return await this.getRepository().save(user);
        } catch (error) {
            global.logger.error(`Error updating user from API data: ${error}`);
            return null;
        }
    }

    /**
     * Updates user permission
     */
    async updateUserPermission(
        userId: string,
        permission: string
    ): Promise<User | null> {
        try {
            const user = await this.findUserById(userId);
            if (!user) return null;

            user.permission = permission;
            return await this.getRepository().save(user);
        } catch (error) {
            global.logger.error(`Error updating user permission: ${error}`);
            return null;
        }
    }

    /**
     * Gets all active users (active in the last X days)
     */
    async getActiveUsers(days: number = 30): Promise<User[]> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            return await this.getRepository().find({
                where: {
                    lastActive: MoreThan(cutoffDate)
                },
                order: {
                    lastActive: 'DESC'
                }
            });
        } catch (error) {
            global.logger.error(`Error getting active users: ${error}`);
            return [];
        }
    }

    /**
     * Checks if a user is an admin
     */
    async isUserAdmin(userId: string): Promise<boolean> {
        // First check the ADMIN_IDS array
        if (ADMIN_IDS.includes(userId)) {
            return true;
        }

        // Then check the database
        try {
            const user = await this.findUserById(userId);
            return !!user && user.permission === 'admin';
        } catch (error) {
            global.logger.error(`Error checking if user is admin: ${error}`);
            return false;
        }
    }

    /**
     * Checks if a user has the required permission
     */
    async hasPermission(
        userId: string,
        requiredPermission: 'user' | 'manager' | 'admin'
    ): Promise<boolean> {
        // Admin IDs always have all permissions
        if (ADMIN_IDS.includes(userId)) {
            return true;
        }

        try {
            const user = await this.findUserById(userId);
            if (!user) {
                // Default to user permission for new users
                return requiredPermission === 'user';
            }

            // Check permission hierarchy
            switch (user.permission) {
                case 'admin':
                    return true; // Admin has all permissions
                case 'manager':
                    return requiredPermission !== 'admin'; // Manager has user and manager permissions
                case 'user':
                    return requiredPermission === 'user'; // User only has user permission
                default:
                    return requiredPermission === 'user';
            }
        } catch (error) {
            global.logger.error(`Error checking user permission: ${error}`);
            return false;
        }
    }

    /**
     * Bans a user
     */
    async banUser(userId: string, reason: string): Promise<User | null> {
        try {
            const user = await this.findUserById(userId);
            if (!user) return null;

            user.banned = true;
            user.banReason = reason;
            user.banTime = new Date();

            return await this.getRepository().save(user);
        } catch (error) {
            global.logger.error(`Error banning user: ${error}`);
            return null;
        }
    }

    /**
     * Unbans a user
     */
    async unbanUser(userId: string): Promise<User | null> {
        try {
            const user = await this.findUserById(userId);
            if (!user) return null;

            user.banned = false;
            user.banReason = null;

            return await this.getRepository().save(user);
        } catch (error) {
            global.logger.error(`Error unbanning user: ${error}`);
            return null;
        }
    }

    /**
     * Checks if a user is banned
     */
    async isUserBanned(userId: string): Promise<boolean> {
        try {
            const user = await this.findUserById(userId);
            return !!user && user.banned;
        } catch (error) {
            global.logger.error(`Error checking if user is banned: ${error}`);
            return false;
        }
    }

    /**
     * Updates user statistics after a message
     */
    async updateUserStats(userId: string, expGain: number = 1): Promise<User | null> {
        try {
            const user = await this.findUserById(userId);
            if (!user) return null;

            // Update message count and exp
            user.messageCount += 1;
            user.exp += expGain;

            // Update level based on exp
            // Simple level formula: level = floor(sqrt(exp / 10)) + 1
            const newLevel = Math.floor(Math.sqrt(user.exp / 10)) + 1;
            if (newLevel > user.level) {
                user.level = newLevel;
                // Could trigger level-up events or rewards here
            }

            // Update last active time
            user.lastActive = new Date();

            return await this.getRepository().save(user);
        } catch (error) {
            global.logger.error(`Error updating user stats: ${error}`);
            return null;
        }
    }
}