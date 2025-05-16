/**
 * File: src/events/groupHandler.ts
 * Mô tả: Xử lý sự kiện nhóm
 */

import { GroupEventType } from 'zca-js';
import { createOrUpdateUser } from '../database/models/user';
import { createOrUpdateGroup } from '../database/models/group';
import { BOT_CONFIG } from '../config';
import { sendTextMessage, sendSuccess } from '../utils/messageHelper';
import global from '../global';

/**
 * Thiết lập trình lắng nghe sự kiện nhóm
 */
export function setupGroupEventListener() {
    if (!global.bot) {
        global.logger.error('Bot chưa được khởi tạo, không thể thiết lập group event listener');
        return;
    }

    global.bot.listener.on('group_event', async (data) => {
        try {
            const groupId = data.threadId;

            // Cập nhật thông tin nhóm
            try {
                // Check that global.bot is still available
                if (global.bot) {
                    const groupInfo = await global.bot.getGroupInfo(groupId);
                    await createOrUpdateGroup(groupId, groupInfo.name);
                } else {
                    global.logger.error('Bot not available when trying to update group info');
                    return;
                }
            } catch (error) {
                global.logger.error(`Lỗi cập nhật thông tin nhóm: ${error}`);
            }

            // Xử lý các loại sự kiện nhóm
            switch (data.type) {
                case GroupEventType.JOIN:
                    await handleJoinEvent(data, groupId);
                    break;

                case GroupEventType.LEAVE:
                    await handleLeaveEvent(data, groupId);
                    break;

                case GroupEventType.UPDATE:
                    await handleUpdateEvent(data, groupId);
                    break;

                case GroupEventType.ADD_ADMIN:
                    await handleAddAdminEvent(data, groupId);
                    break;

                case GroupEventType.REMOVE_ADMIN:
                    await handleRemoveAdminEvent(data, groupId);
                    break;

                case GroupEventType.REMOVE_MEMBER:
                    await handleRemoveMemberEvent(data, groupId);
                    break;

                case GroupEventType.BLOCK_MEMBER:
                    await handleBlockMemberEvent(data, groupId);
                    break;

                case GroupEventType.JOIN_REQUEST:
                    await handleJoinRequestEvent(data, groupId);
                    break;

                default:
                    // Ghi log các sự kiện khác
                    global.logger.info(`Nhận được sự kiện nhóm khác: ${data.type} - ${JSON.stringify(data.data)}`);
                    break;
            }

        } catch (error) {
            global.logger.error(`Lỗi xử lý sự kiện nhóm: ${error}`);
        }
    });

    global.logger.info('Đã thiết lập group_event listener');
}

/**
 * Xử lý sự kiện người dùng tham gia nhóm
 */
async function handleJoinEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleJoinEvent');
            return;
        }

        for (const userId of data.data.userIDs) {
            // Kiểm tra nếu người tham gia là bot
            if (global.bot.id === userId) {
                // Bot vừa được thêm vào nhóm
                await sendTextMessage(
                    `👋 Xin chào! Tôi là ${BOT_CONFIG.botName} 🤖\n\n` +
                    `Cảm ơn đã mời tôi vào nhóm. Để sử dụng các tính năng của bot, ` +
                    `nhóm cần kích hoạt dịch vụ trước.\n\n` +
                    `Gõ "${BOT_CONFIG.prefix}rent" để xem thông tin các gói dịch vụ và thuê bot.`,
                    groupId,
                    true
                );
                continue;
            }

            // Lấy thông tin người dùng
            const userInfo = await global.bot.getUserInfo(userId);
            await createOrUpdateUser(userId, userInfo.displayName);

            // Gửi lời chào
            await sendTextMessage(
                `👋 Chào mừng ${userInfo.displayName} đã tham gia nhóm!`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Lỗi xử lý thành viên mới tham gia: ${error}`);
    }
}

/**
 * Xử lý sự kiện người dùng rời nhóm
 */
async function handleLeaveEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleLeaveEvent');
            return;
        }

        for (const userId of data.data.userIDs) {
            // Lấy thông tin người dùng
            const userInfo = await global.bot.getUserInfo(userId);

            // Gửi thông báo
            await sendTextMessage(
                `👋 ${userInfo.displayName} đã rời khỏi nhóm.`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Lỗi xử lý thành viên rời nhóm: ${error}`);
    }
}

/**
 * Xử lý sự kiện cập nhật nhóm
 */
async function handleUpdateEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleUpdateEvent');
            return;
        }

        // Kiểm tra nếu là cập nhật tên nhóm
        if (data.data.update_type === 'name') {
            // Cập nhật tên nhóm trong DB
            const groupInfo = await global.bot.getGroupInfo(groupId);
            await createOrUpdateGroup(groupId, groupInfo.name);

            // Gửi thông báo
            await sendTextMessage(
                `📝 Tên nhóm đã được đổi thành "${groupInfo.name}".`,
                groupId,
                true
            );
        }
        // Kiểm tra nếu là cập nhật ảnh nhóm
        else if (data.data.update_type === 'avatar') {
            await sendTextMessage(
                `🖼️ Ảnh đại diện nhóm đã được cập nhật.`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Lỗi xử lý cập nhật nhóm: ${error}`);
    }
}

/**
 * Xử lý sự kiện thêm quản trị viên
 */
async function handleAddAdminEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleAddAdminEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);
        if (data.data.adminType === 1) { // Trưởng nhóm
            await sendTextMessage(
                `🎖️ ${userInfo.displayName} đã trở thành trưởng nhóm.`,
                groupId,
                true
            );
        } else { // Phó nhóm
            await sendTextMessage(
                `👮 ${userInfo.displayName} đã trở thành phó nhóm.`,
                groupId,
                true
            );
        }

        // Cập nhật quyền trong DB nếu cần
        await createOrUpdateUser(data.data.userID, userInfo.displayName, 'manager');

    } catch (error) {
        global.logger.error(`Lỗi xử lý thêm quản trị viên: ${error}`);
    }
}

/**
 * Xử lý sự kiện gỡ quản trị viên
 */
async function handleRemoveAdminEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleRemoveAdminEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);
        await sendTextMessage(
            `👋 ${userInfo.displayName} đã bị gỡ quyền phó nhóm.`,
            groupId,
            true
        );

        // Cập nhật quyền trong DB nếu cần
        await createOrUpdateUser(data.data.userID, userInfo.displayName, 'user');

    } catch (error) {
        global.logger.error(`Lỗi xử lý gỡ quản trị viên: ${error}`);
    }
}

/**
 * Xử lý sự kiện xóa thành viên
 */
async function handleRemoveMemberEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleRemoveMemberEvent');
            return;
        }

        for (const userId of data.data.userIDs) {
            const userInfo = await global.bot.getUserInfo(userId);
            await sendTextMessage(
                `🚫 ${userInfo.displayName} đã bị xóa khỏi nhóm.`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Lỗi xử lý xóa thành viên: ${error}`);
    }
}

/**
 * Xử lý sự kiện chặn thành viên
 */
async function handleBlockMemberEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleBlockMemberEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);
        await sendTextMessage(
            `🔒 ${userInfo.displayName} đã bị chặn khỏi nhóm.`,
            groupId,
            true
        );
    } catch (error) {
        global.logger.error(`Lỗi xử lý chặn thành viên: ${error}`);
    }
}

/**
 * Xử lý sự kiện yêu cầu tham gia
 */
async function handleJoinRequestEvent(data, groupId) {
    try {
        // Check if bot is available
        if (!global.bot) {
            global.logger.error('Bot not available in handleJoinRequestEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);

        // Thông báo cho quản trị viên nhóm
        await sendTextMessage(
            `📩 ${userInfo.displayName} đã yêu cầu tham gia nhóm.`,
            groupId,
            true
        );
    } catch (error) {
        global.logger.error(`Lỗi xử lý yêu cầu tham gia: ${error}`);
    }
}