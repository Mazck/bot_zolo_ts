import { groupService } from '../database/services';
import global from '../global';

/**
 * Checks if a group is activated
 * 
 * @param groupId ID of the group to check
 * @returns true if group is activated and not expired, false otherwise
 */
export async function activationCheck(groupId: string): Promise<boolean> {
    try {
        // If no group ID provided, allow (for direct messages)
        if (!groupId) {
            return true;
        }

        // Find group in database
        const group = await groupService().findGroupById(groupId);

        // If group not found in database
        if (!group) {
            global.logger.info(`Group ${groupId} not found in database`);
            return false;
        }

        // Check activation status
        if (!group.isActive) {
            global.logger.info(`Group ${groupId} is not activated`);
            return false;
        }

        // Check if expired
        const now = new Date();
        if (group.expiresAt && group.expiresAt < now) {
            global.logger.info(`Group ${groupId} subscription expired on ${group.expiresAt}`);
            return false;
        }

        // Group is activated and not expired
        return true;

    } catch (error) {
        global.logger.error(`Error checking group activation (${groupId}): ${error}`);
        return false; // Fail safe by denying access on errors
    }
}