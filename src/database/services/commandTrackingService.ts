/**
 * Command Tracking Repository Service
 * 
 * This service handles tracking command usage for rate limiting and analytics
 */

import { CommandUsage } from '../entities';
import { DatabaseService } from '../index';
import { LessThan, MoreThanOrEqual } from 'typeorm';
import global from '../../global';
import { ANTI_SPAM_CONFIG } from '../../config';

/**
 * Command tracking service for database operations
 */
export class CommandTrackingService extends DatabaseService<CommandUsage> {
    constructor() {
        super(CommandUsage);
    }

    /**
     * Adds a new command usage record
     */
    async addCommandUsage(
        userId: string,
        commandName: string
    ): Promise<CommandUsage | null> {
        try {
            const usage = this.getRepository().create({
                userId,
                commandName
            });

            return await this.getRepository().save(usage);
        } catch (error) {
            global.logger.error(`Error adding command usage: ${error}`);
            return null;
        }
    }

    /**
     * Checks if a user is spamming commands
     */
    async isUserSpamming(
        userId: string,
        commandName?: string,
        maxCommands: number = ANTI_SPAM_CONFIG.maxCommands,
        timeWindow: number = ANTI_SPAM_CONFIG.timeWindow,
        cooldownTime: number = ANTI_SPAM_CONFIG.cooldownTime
    ): Promise<boolean> {
        try {
            // Skip spam check for excluded commands
            if (commandName && ANTI_SPAM_CONFIG.excludedCommands.includes(commandName)) {
                return false;
            }

            // Calculate time window start
            const timeWindowStart = new Date(Date.now() - timeWindow);

            // Query to count recent commands
            const query = this.getRepository().createQueryBuilder('usage')
                .where('usage.userId = :userId', { userId })
                .andWhere('usage.usedAt >= :timeWindowStart', { timeWindowStart });

            // Add command name filter if provided
            if (commandName) {
                query.andWhere('usage.commandName = :commandName', { commandName });
            }

            // Get count of recent commands
            const count = await query.getCount();

            // If exceeding max commands, check for cooldown
            if (count >= maxCommands) {
                // Calculate cooldown start
                const cooldownStart = new Date(Date.now() - cooldownTime);

                // Query to count commands during cooldown period
                const cooldownQuery = this.getRepository().createQueryBuilder('usage')
                    .where('usage.userId = :userId', { userId })
                    .andWhere('usage.usedAt >= :cooldownStart', { cooldownStart });

                if (commandName) {
                    cooldownQuery.andWhere('usage.commandName = :commandName', { commandName });
                }

                const cooldownViolations = await cooldownQuery.getCount();

                // User is spamming if there are violations during cooldown
                return cooldownViolations > 0;
            }

            return false;
        } catch (error) {
            global.logger.error(`Error checking if user is spamming: ${error}`);
            return false; // Fail open to avoid blocking legitimate users
        }
    }

    /**
     * Cleans up old command usage records
     */
    async cleanupOldCommandUsage(
        olderThanMs: number = 24 * 60 * 60 * 1000 // 24 hours by default
    ): Promise<number> {
        try {
            const cutoffDate = new Date(Date.now() - olderThanMs);

            const result = await this.getRepository().delete({
                usedAt: LessThan(cutoffDate)
            });

            const deletedCount = result.affected || 0;
            global.logger.info(`Cleaned up ${deletedCount} old command usage records`);

            return deletedCount;
        } catch (error) {
            global.logger.error(`Error cleaning up old command usage: ${error}`);
            return 0;
        }
    }

    /**
     * Gets command usage statistics
     */
    async getCommandStats(
        startDate?: Date,
        endDate?: Date
    ): Promise<Record<string, number>> {
        try {
            const query = this.getRepository().createQueryBuilder('usage')
                .select('usage.commandName', 'commandName')
                .addSelect('COUNT(*)', 'count')
                .groupBy('usage.commandName');

            if (startDate) {
                query.andWhere('usage.usedAt >= :startDate', { startDate });
            }

            if (endDate) {
                query.andWhere('usage.usedAt <= :endDate', { endDate });
            }

            const results = await query.getRawMany();

            const stats: Record<string, number> = {};
            results.forEach(result => {
                stats[result.commandName] = parseInt(result.count, 10);
            });

            return stats;
        } catch (error) {
            global.logger.error(`Error getting command stats: ${error}`);
            return {};
        }
    }

    /**
     * Gets user activity statistics
     */
    async getUserActivityStats(
        startDate?: Date,
        endDate?: Date,
        limit: number = 10
    ): Promise<{ userId: string; count: number }[]> {
        try {
            const query = this.getRepository().createQueryBuilder('usage')
                .select('usage.userId', 'userId')
                .addSelect('COUNT(*)', 'count')
                .groupBy('usage.userId')
                .orderBy('count', 'DESC')
                .limit(limit);

            if (startDate) {
                query.andWhere('usage.usedAt >= :startDate', { startDate });
            }

            if (endDate) {
                query.andWhere('usage.usedAt <= :endDate', { endDate });
            }

            const results = await query.getRawMany();

            return results.map(result => ({
                userId: result.userId,
                count: parseInt(result.count, 10)
            }));
        } catch (error) {
            global.logger.error(`Error getting user activity stats: ${error}`);
            return [];
        }
    }

    /**
     * Gets hourly usage statistics
     */
    async getHourlyUsageStats(
        days: number = 7
    ): Promise<Record<number, number>> {
        try {
            // Calculate start date
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Using raw SQL for hour extraction for better compatibility
            const query = this.getRepository().createQueryBuilder('usage')
                .select(`HOUR(usage.usedAt)`, 'hour') // May need adjustment for SQLite
                .addSelect('COUNT(*)', 'count')
                .where('usage.usedAt >= :startDate', { startDate })
                .groupBy('hour')
                .orderBy('hour', 'ASC');

            const results = await query.getRawMany();

            const stats: Record<number, number> = {};
            for (let hour = 0; hour < 24; hour++) {
                stats[hour] = 0;
            }

            results.forEach(result => {
                const hour = parseInt(result.hour, 10);
                stats[hour] = parseInt(result.count, 10);
            });

            return stats;
        } catch (error) {
            global.logger.error(`Error getting hourly usage stats: ${error}`);
            return Array(24).fill(0).reduce((acc, _, i) => ({ ...acc, [i]: 0 }), {});
        }
    }
}

// Create and export a singleton instance
const commandTrackingService = new CommandTrackingService();
export default commandTrackingService;