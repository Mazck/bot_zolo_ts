import { CommandParams } from '../types';
import { UserPermission } from '../config'; // Import UserPermission
import { sendTextMessage, sendError } from '../utils/messageHelper';
import { findGroupById } from '../database/models/group';
import global from '../global';

const groupinfoCommand = {
    name: 'groupinfo',
    aliases: ['group', 'nhóm', 'thông-tin-nhóm'],
    description: 'Hiển thị thông tin chi tiết về nhóm',
    usage: '/groupinfo',
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
            // Lấy thông tin nhóm từ Zalo API
            if (!global.bot) {
                await sendError(
                    'Bot không khả dụng, vui lòng thử lại sau',
                    threadId,
                    true
                );
                return;
            }

            const zaloGroupInfo = await global.bot.getGroupInfo(threadId);

            // Lấy thông tin nhóm từ database
            const dbGroup = await findGroupById(threadId);

            // Tạo thông báo thông tin nhóm
            let infoMessage = `📋 THÔNG TIN NHÓM\n\n`;

            // Thông tin cơ bản
            infoMessage += `▶️ Tên nhóm: ${zaloGroupInfo.name}\n`;
            infoMessage += `▶️ ID nhóm: ${zaloGroupInfo.id}\n`;
            infoMessage += `▶️ Tổng thành viên: ${zaloGroupInfo.totalParticipants}\n`;

            // Thông tin quản trị viên
            if (zaloGroupInfo.adminIds && zaloGroupInfo.adminIds.length > 0) {
                infoMessage += `▶️ Số phó nhóm: ${zaloGroupInfo.adminIds.length}\n`;
            }

            if (zaloGroupInfo.ownerIds && zaloGroupInfo.ownerIds.length > 0) {
                infoMessage += `▶️ Trưởng nhóm: ${zaloGroupInfo.ownerIds.length} người\n`;
            }

            // Thông tin trạng thái bot
            if (dbGroup) {
                infoMessage += `\n📊 TRẠNG THÁI BOT\n`;
                infoMessage += `▶️ Trạng thái: ${dbGroup.isActive ? '✅ Đã kích hoạt' : '❌ Chưa kích hoạt'}\n`;

                if (dbGroup.isActive && dbGroup.expiresAt) {
                    infoMessage += `▶️ Hết hạn: ${dbGroup.expiresAt.toLocaleString('vi-VN')}\n`;

                    const now = new Date();
                    if (dbGroup.expiresAt > now) {
                        // Tính số ngày còn lại
                        const daysLeft = Math.ceil((dbGroup.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        infoMessage += `▶️ Còn lại: ${daysLeft} ngày\n`;
                    } else {
                        infoMessage += `▶️ Trạng thái: ⚠️ ĐÃ HẾT HẠN\n`;
                    }
                }
            } else {
                infoMessage += `\n⚠️ Nhóm chưa có trong cơ sở dữ liệu của bot.`;
            }

            // Gửi thông báo
            await sendTextMessage(infoMessage, threadId, true);

        } catch (error) {
            await sendError(
                `Đã xảy ra lỗi khi lấy thông tin nhóm: ${error.message}`,
                threadId,
                true
            );
        }
    }
};

export default groupinfoCommand;