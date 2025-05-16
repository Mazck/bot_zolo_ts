import global from '../global';

/**
 * Helper function to get user info
 * @param userId User ID to fetch info for
 * @returns User info or null if error
 */
export async function getUserInfo(userId: string) {
    if (!global.bot) {
        global.logger.error('Bot not available when getting user info');
        return null;
    }

    try {
        return await global.bot.getUserInfo(userId);
    } catch (error) {
        global.logger.error(`Error getting user info for ${userId}: ${error}`);
        return null;
    }
}

/**
 * Helper function to get group info
 * @param groupId Group ID to fetch info for
 * @returns Group info or null if error
 */
export async function getGroupInfo(groupId: string) {
    if (!global.bot) {
        global.logger.error('Bot not available when getting group info');
        return null;
    }

    try {
        return await global.bot.getGroupInfo(groupId);
    } catch (error) {
        global.logger.error(`Error getting group info for ${groupId}: ${error}`);
        return null;
    }
}

// Add more helper functions as needed