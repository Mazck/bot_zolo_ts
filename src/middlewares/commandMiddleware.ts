import { activationCheck } from './activationCheck';
import { permissionCheck } from './permissionCheck';
import { antiSpamCheck } from './antiSpam';
import { sendTextMessage } from '../utils/messageHelper';
import global from '../global';

/**
 * Middleware for processing commands
 * Performs checks in the following order:
 * 1. Anti-spam check
 * 2. Group activation check
 * 3. User permission check
 * 
 * @param params Command parameters (userId, groupId, command, etc.)
 * @param execute Function to execute if all checks pass
 */
export async function commandMiddleware(
    params: {
        userId: string;
        groupId?: string;
        isGroup: boolean;
        command: any;
    },
    execute: () => Promise<void>
): Promise<void> {
    const { userId, groupId, isGroup, command } = params;

    // Validate required parameters
    if (!userId || !command) {
        global.logger.error('Missing required parameters for command middleware');
        return;
    }

    try {
        // 1. Anti-spam check
        const notSpamming = await antiSpamCheck(userId, command);
        if (!notSpamming) {
            await sendTextMessage(
                'Bạn đang gửi lệnh quá nhanh. Vui lòng thử lại sau.',
                isGroup && groupId ? groupId : userId,
                isGroup
            );
            return;
        }

        // 2. Group activation check (only for group messages)
        if (isGroup && groupId) {
            const isActivated = await activationCheck(groupId);
            if (!isActivated) {
                await sendRentInfo(groupId);
                return;
            }
        }

        // 3. Permission check
        const hasPermission = await permissionCheck(userId, command.requiredPermission);
        if (!hasPermission) {
            await sendTextMessage(
                `Bạn không có quyền ${command.requiredPermission} để sử dụng lệnh này.`,
                isGroup && groupId ? groupId : userId,
                isGroup
            );
            return;
        }

        // Execute command if all checks pass
        await execute();

    } catch (error) {
        global.logger.error(`Error in command middleware: ${error}`);
        await sendTextMessage(
            'Đã xảy ra lỗi khi xử lý lệnh. Vui lòng thử lại sau.',
            isGroup && groupId ? groupId : userId,
            isGroup
        );
    }
}

/**
 * Sends information about renting the bot when a group isn't activated
 */
async function sendRentInfo(groupId: string): Promise<void> {
    try {
        const message = `📢 Nhóm chưa kích hoạt dịch vụ\n\n` +
            `Để sử dụng các tính năng của bot, nhóm cần được kích hoạt trước.\n` +
            `Sử dụng lệnh /rent để xem thông tin về các gói dịch vụ.\n\n` +
            `🔹 Gói Cơ bản: 99.000đ/30 ngày\n` +
            `🔹 Gói Premium: 249.000đ/90 ngày\n` +
            `🔹 Gói VIP: 899.000đ/365 ngày`;

        await sendTextMessage(message, groupId, true);
    } catch (error) {
        global.logger.error(`Error sending rent info: ${error}`);
    }
}