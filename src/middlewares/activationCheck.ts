import { findGroupById } from '../database/models/group';
import global from '../global';

/**
 * Kiểm tra nhóm đã kích hoạt hay chưa
 * 
 * @param groupId ID nhóm cần kiểm tra
 * @returns true nếu nhóm đã kích hoạt và còn hạn, false nếu chưa kích hoạt hoặc hết hạn
 */
export async function activationCheck(groupId) {
    try {
        // Nếu không phải nhóm hoặc không có ID nhóm
        if (!groupId) {
            return true; // Luôn cho phép trong tin nhắn cá nhân
        }

        // Tìm thông tin nhóm trong cơ sở dữ liệu
        const group = await findGroupById(groupId);

        // Nếu không tìm thấy nhóm
        if (!group) {
            global.logger.info(`Không tìm thấy thông tin nhóm ${groupId} trong cơ sở dữ liệu`);
            return false;
        }

        // Kiểm tra trạng thái kích hoạt
        if (!group.isActive) {
            global.logger.info(`Nhóm ${groupId} chưa được kích hoạt`);
            return false;
        }

        // Kiểm tra thời hạn
        const now = new Date();
        if (group.expiresAt && group.expiresAt < now) {
            global.logger.info(`Nhóm ${groupId} đã hết hạn vào ${group.expiresAt}`);
            return false;
        }

        // Nhóm đã kích hoạt và còn hạn
        return true;

    } catch (error) {
        global.logger.error(`Lỗi kiểm tra kích hoạt nhóm ${groupId}: ${error}`);
        return false; // Mặc định từ chối nếu có lỗi
    }
}