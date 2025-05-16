/**
 * File: src/events/messageHandler.ts
 * Mô tả: Xử lý sự kiện tin nhắn
 */

import { createOrUpdateUser } from '../database/models/user';
import { createOrUpdateGroup } from '../database/models/group';
import { BOT_CONFIG } from '../config';
import { commandMiddleware } from '../middlewares/commandMiddleware';
import { sendTextMessage, sendError } from '../utils/messageHelper';
import global from '../global';

/**
 * Thiết lập trình lắng nghe tin nhắn
 */
export function setupMessageListener() {
    if (!global.bot) {
        global.logger.error('Bot chưa được khởi tạo, không thể thiết lập message listener');
        return;
    }

    global.bot.listener.on("message", async (message) => {
        try {
            // Kiểm tra nếu tin nhắn từ chính bot
            if (message.isSelf) {
                return;
            }

            // Xác định loại tin nhắn (nhóm hoặc cá nhân)
            const isGroup = message.type === 'Group';
            const userId = isGroup ? message.data.senderID : message.threadId;
            const groupId = isGroup ? message.threadId : undefined;

            // Lấy nội dung tin nhắn
            const messageContent = message.data.body || '';

            // Cập nhật thông tin người dùng
            try {
                // Add null check for global.bot
                if (global.bot) {
                    const userInfo = await global.bot.getUserInfo(userId);
                    await createOrUpdateUser(userId, userInfo.displayName);
                } else {
                    global.logger.error('Bot is null when trying to get user info');
                }
            } catch (error) {
                global.logger.error(`Lỗi cập nhật thông tin người dùng: ${error}`);
            }

            // Cập nhật thông tin nhóm nếu tin nhắn từ nhóm
            if (isGroup && groupId) {
                try {
                    // Add null check for global.bot
                    if (global.bot) {
                        const groupInfo = await global.bot.getGroupInfo(groupId);
                        await createOrUpdateGroup(groupId, groupInfo.name);
                    } else {
                        global.logger.error('Bot is null when trying to get group info');
                    }
                } catch (error) {
                    global.logger.error(`Lỗi cập nhật thông tin nhóm: ${error}`);
                }
            }

            // Xử lý lệnh
            if (messageContent && messageContent.startsWith(BOT_CONFIG.prefix)) {
                await handleCommand(message, isGroup, groupId, userId, messageContent);
            }

        } catch (error) {
            global.logger.error(`Lỗi xử lý tin nhắn: ${error}`);
        }
    });

    global.logger.info('Đã thiết lập message listener');
}

/**
 * Xử lý lệnh từ tin nhắn
 */
async function handleCommand(message, isGroup, groupId, userId, messageContent) {
    const args = messageContent.slice(BOT_CONFIG.prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Tìm lệnh tương ứng
    let command = global.commands.get(commandName);

    // Kiểm tra bí danh
    if (!command) {
        for (const [name, cmd] of global.commands.entries()) {
            if (cmd.aliases && cmd.aliases.includes(commandName)) {
                command = cmd;
                break;
            }
        }
    }

    if (!command) {
        global.logger.info(`Người dùng ${userId} sử dụng lệnh không tồn tại: ${commandName}`);
        return;
    }

    // Chuẩn bị tham số cho middleware và thực thi
    const params = {
        message: message.data,
        args,
        userId,
        groupId,
        isGroup,
        command
    };

    // Xử lý lệnh thông qua middleware
    await commandMiddleware(params, async () => {
        try {
            // Thực thi lệnh khi đã qua tất cả các kiểm tra
            global.logger.info(`Người dùng ${userId} thực thi lệnh ${command.name} với tham số: ${args.join(' ')}`);

            await command.execute({
                message: message.data,
                args,
                userId,
                groupId,
                isGroup
            });

        } catch (error) {
            global.logger.error(`Lỗi thực thi lệnh ${command.name}: ${error}`);

            await sendError(
                `Đã xảy ra lỗi khi thực thi lệnh "${command.name}". Vui lòng thử lại sau.`,
                isGroup && groupId ? groupId : userId,
                !!groupId
            );
        }
    });
}