import { UserPermission } from '../config';
import { findUserById } from '../database/models/user';
import { ADMIN_IDS } from '../config';
import global from '../global';

/**
 * Kiểm tra quyền người dùng
 * 
 * @param userId ID người dùng cần kiểm tra
 * @param requiredPermission Quyền yêu cầu (user, manager, admin)
 * @returns true nếu người dùng có quyền, false nếu không
 */
export async function permissionCheck(userId, requiredPermission) {
    try {
        // Kiểm tra ID hợp lệ
        if (!userId) {
            global.logger.error('ID người dùng không hợp lệ');
            return false;
        }

        // Kiểm tra nếu người dùng là admin (từ cấu hình)
        if (ADMIN_IDS.includes(userId)) {
            return true; // Admin luôn có đủ quyền
        }

        // Chuyển đổi requiredPermission thành enum nếu là chuỗi
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
                    global.logger.error(`Quyền không hợp lệ: ${requiredPermission}`);
                    return false;
            }
        }

        // Tìm người dùng trong cơ sở dữ liệu
        const user = await findUserById(userId);

        // Nếu không tìm thấy người dùng
        if (!user) {
            global.logger.info(`Không tìm thấy người dùng ${userId} trong cơ sở dữ liệu`);
            return requiredPermEnum === UserPermission.USER; // Mặc định là người dùng thường
        }

        // Chuyển đổi quyền người dùng từ chuỗi thành enum nếu cần
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

        // Kiểm tra quyền
        if (userPermEnum === UserPermission.ADMIN) {
            return true; // Admin luôn có đủ quyền
        }

        if (userPermEnum === UserPermission.MANAGER &&
            (requiredPermEnum === UserPermission.MANAGER ||
                requiredPermEnum === UserPermission.USER)) {
            return true; // Manager có quyền manager và user
        }

        if (userPermEnum === UserPermission.USER &&
            requiredPermEnum === UserPermission.USER) {
            return true; // User chỉ có quyền user
        }

        // Không đủ quyền
        global.logger.info(`Người dùng ${userId} (${userPermEnum}) không đủ quyền ${requiredPermEnum}`);
        return false;

    } catch (error) {
        global.logger.error(`Lỗi kiểm tra quyền người dùng ${userId}: ${error}`);
        return false; // Mặc định từ chối nếu có lỗi
    }
}