import { CommandParams } from '../types';
import { UserPermission } from '../config'; // Import UserPermission
import { findGroupById } from '../database/models/group';
import { sendTextMessage, sendError } from '../utils/messageHelper';
import { formatTimeRemaining } from '../utils/helpers';

const statusCommand = {
    name: 'status',
    aliases: ['info', 'status-bot', 'trạng-thái'],
    description: 'Kiểm tra trạng thái thuê bot',
    usage: '/status',
    requiredPermission: UserPermission.USER,  // Use enum instead of string

    execute: async (params: CommandParams) => {
        const { threadId, isGroup, userId } = params;

        // Kiểm tra nếu không phải nhóm
        if (!isGroup) {
            await sendError(
                'Lệnh này chỉ có thể sử dụng trong nhóm',
                userId,
                false
            );
            return;
        }

        try {
            // Lấy thông tin nhóm từ database
            const group = await findGroupById(threadId);

            if (!group) {
                await sendTextMessage(
                    '⚠️ Không tìm thấy thông tin nhóm trong cơ sở dữ liệu.',
                    threadId,
                    true
                );
                return;
            }

            // Tạo thông báo trạng thái
            let statusMessage = `📊 TRẠNG THÁI BOT\n\n`;
            statusMessage += `▶️ Tên nhóm: ${group.name}\n`;

            // Trạng thái kích hoạt
            if (group.isActive) {
                statusMessage += `▶️ Trạng thái: ✅ Đã kích hoạt\n`;

                if (group.activatedAt) {
                    statusMessage += `▶️ Kích hoạt vào: ${group.activatedAt.toLocaleString('vi-VN')}\n`;
                }

                if (group.expiresAt) {
                    const now = new Date();

                    if (group.expiresAt > now) {
                        const timeRemaining = formatTimeRemaining(group.expiresAt);
                        statusMessage += `▶️ Hết hạn: ${group.expiresAt.toLocaleString('vi-VN')}\n`;
                        statusMessage += `▶️ Thời gian còn lại: ${timeRemaining}\n`;
                    } else {
                        statusMessage += `▶️ Hết hạn: ⚠️ ĐÃ HẾT HẠN (${group.expiresAt.toLocaleString('vi-VN')})\n`;
                        statusMessage += `💡 Vui lòng sử dụng lệnh /extend để gia hạn bot.`;
                    }
                }
            } else {
                statusMessage += `▶️ Trạng thái: ❌ Chưa kích hoạt\n`;
                statusMessage += `💡 Vui lòng sử dụng lệnh /rent để thuê bot.`;
            }

            // Gửi thông báo
            await sendTextMessage(statusMessage, threadId, true);

        } catch (error: any) {
            await sendError(
                `Đã xảy ra lỗi khi kiểm tra trạng thái: ${error.message}`,
                threadId,
                true
            );
        }
    }
};

export default statusCommand;