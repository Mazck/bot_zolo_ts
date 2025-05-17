import { commandTrackingService } from '../database/services';
import { ANTI_SPAM_CONFIG } from '../config';
import global from '../global';

/**
 * Checks if a user is spamming commands
 * 
 * @param userId ID of the user to check
 * @param command Command being executed
 * @returns true if not spamming, false if detected as spam
 */
export async function antiSpamCheck(userId: string, command: { name: string }): Promise<boolean> {
    try {
        // Skip check for excluded commands
        if (ANTI_SPAM_CONFIG.excludedCommands.includes(command.name)) {
            return true;
        }

        // Check if user is spamming
        const isSpamming = await commandTrackingService().isUserSpamming(
            userId,
            command.name,
            ANTI_SPAM_CONFIG.maxCommands,
            ANTI_SPAM_CONFIG.timeWindow,
            ANTI_SPAM_CONFIG.cooldownTime
        );

        if (isSpamming) {
            global.logger.warn(`Spam detected from user ${userId} for command ${command.name}`);
            return false;
        }

        // Add this command usage to tracking
        await commandTrackingService().addCommandUsage(userId, command.name);
        return true;

    } catch (error) {
        global.logger.error(`Error in anti-spam check for user ${userId}: ${error}`);
        return true; // Allow on error to avoid blocking legitimate users
    }
}