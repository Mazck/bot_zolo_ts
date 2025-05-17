import { UserPermission } from '../config';
import { userService } from '../database/services';
import { ADMIN_IDS } from '../config';
import global from '../global';

/**
 * Checks if a user has the required permission
 * 
 * @param userId ID of the user to check
 * @param requiredPermission Permission level required
 * @returns true if user has permission, false otherwise
 */
export async function permissionCheck(userId: string, requiredPermission: UserPermission | string): Promise<boolean> {
    try {
        // Check for valid user ID
        if (!userId) {
            global.logger.error('Invalid user ID for permission check');
            return false;
        }

        // Admin IDs always have all permissions (from config)
        if (ADMIN_IDS.includes(userId)) {
            return true;
        }

        // Convert string permission to enum if needed
        let requiredPermEnum = requiredPermission;
        if (typeof requiredPermission === 'string') {
            switch (requiredPermission.toLowerCase()) {
                case 'user':
                    requiredPermEnum = UserPermission.USER;
                    break;
                case 'manager':
                    requiredPermEnum = UserPermission.MANAGER;
                    break;
                case 'admin':
                    requiredPermEnum = UserPermission.ADMIN;
                    break;
                default:
                    global.logger.error(`Invalid permission type: ${requiredPermission}`);
                    return false;
            }
        }

        // Get user from database
        const user = await userService().findUserById(userId);

        // Default to user permission for new users
        if (!user) {
            global.logger.info(`User ${userId} not found in database`);
            return requiredPermEnum === UserPermission.USER;
        }

        // Convert user permission string to enum
        let userPermEnum = user.permission;
        if (typeof user.permission === 'string') {
            switch (user.permission.toLowerCase()) {
                case 'user':
                    userPermEnum = UserPermission.USER;
                    break;
                case 'manager':
                    userPermEnum = UserPermission.MANAGER;
                    break;
                case 'admin':
                    userPermEnum = UserPermission.ADMIN;
                    break;
            }
        }

        // Check permission hierarchy
        if (userPermEnum === UserPermission.ADMIN) {
            return true; // Admin has all permissions
        }

        if (userPermEnum === UserPermission.MANAGER &&
            (requiredPermEnum === UserPermission.MANAGER ||
                requiredPermEnum === UserPermission.USER)) {
            return true; // Manager has manager and user permissions
        }

        if (userPermEnum === UserPermission.USER &&
            requiredPermEnum === UserPermission.USER) {
            return true; // User only has user permissions
        }

        // Permission denied
        global.logger.info(`User ${userId} (${userPermEnum}) lacks permission ${requiredPermEnum}`);
        return false;

    } catch (error) {
        global.logger.error(`Error in permission check for user ${userId}: ${error}`);
        return false; // Fail safe by denying access on errors
    }
}