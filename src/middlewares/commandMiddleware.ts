import { activationCheck } from './activationCheck';
import { permissionCheck } from './permissionCheck';
import { antiSpamCheck } from './antiSpam';
import { formatError } from '../utils/formatter';
import { sendTextMessage, sendError } from '../utils/messageHelper';
import global from '../global';

/**
 * Middleware xử lý lệnh tổng hợp
 * Thực hiện các kiểm tra theo thứ tự:
 * 1. Chống spam
 * 2. Kích hoạt nhóm
 * 3. Quyền người dùng
 * 
 * @param params Object chứa thông tin lệnh và người dùng
 * @param execute Hàm thực thi khi tất cả các kiểm tra đều thành công
 */
export async function commandMiddleware(params, execute) {
    const { userId, groupId, isGroup, command } = params;

    // Kiểm tra tham số bắt buộc
    if (!userId || !command) {
        global.logger.error('Thiếu tham số bắt buộc cho middleware');
        return;
    }

    try {
        // 1. Kiểm tra chống spam
        const isNotSpamming = await antiSpamCheck(userId, command);
        if (!isNotSpamming) {
            await sendError(
                'Bạn đang gửi lệnh quá nhanh. Vui lòng thử lại sau.',
                isGroup && groupId ? groupId : userId,
                isGroup
            );
            return;
        }

        // 2. Kiểm tra kích hoạt nhóm (chỉ trong nhóm)
        if (isGroup && groupId) {
            const isActivated = await activationCheck(groupId);
            if (!isActivated) {
                // Nhóm chưa kích hoạt, hiển thị thông tin thuê bot
                await sendRentInfo(groupId);
                return;
            }
        }

        // 3. Kiểm tra quyền
        const hasPermission = await permissionCheck(userId, command.requiredPermission);
        if (!hasPermission) {
            await sendError(
                `Bạn không có quyền ${command.requiredPermission} để sử dụng lệnh này.`,
                isGroup && groupId ? groupId : userId,
                isGroup
            );
            return;
        }

        // Thực thi lệnh sau khi đã qua tất cả các kiểm tra
        await execute();

    } catch (error) {
        global.logger.error(`Lỗi trong command middleware: ${error}`);
        await sendError(
            'Đã xảy ra lỗi khi xử lý lệnh. Vui lòng thử lại sau.',
            isGroup && groupId ? groupId : userId,
            isGroup
        );
    }
}

/**
 * Hiển thị thông tin thuê bot
 * @param groupId ID nhóm
 */
async function sendRentInfo(groupId) {
    try {
        const message = `📢 Nhóm chưa kích hoạt dịch vụ\n\n` +
            `Để sử dụng các tính năng của bot, nhóm cần được kích hoạt trước.\n` +
            `Sử dụng lệnh /rent để xem thông tin về các gói dịch vụ.\n\n` +
            `🔹 Gói Cơ bản: 99.000đ/30 ngày\n` +
            `🔹 Gói Premium: 249.000đ/90 ngày\n` +
            `🔹 Gói VIP: 899.000đ/365 ngày`;

        await sendTextMessage(message, groupId, true);
    } catch (error) {
        global.logger.error(`Lỗi gửi thông tin thuê: ${error}`);
    }
}