import { GroupEventType } from 'zca-js';
import { userService, groupService } from '../database/services';
import { BOT_CONFIG } from '../config';
import { sendTextMessage, sendSuccess } from '../utils/messageHelper';
import global from '../global';

/**
 * Sets up the group event listener
 */
export function setupGroupEventListener() {
    if (!global.bot) {
        global.logger.error('Bot not initialized, cannot set up group event listener');
        return;
    }

    global.bot.listener.on('group_event', async (data) => {
        try {
            const groupId = data.threadId;

            // Update group information
            try {
                if (global.bot) {
                    const groupInfo = await global.bot.getGroupInfo(groupId);
                    await groupService().createOrUpdateGroup(groupId, groupInfo.name);
                } else {
                    global.logger.error('Bot not available when trying to update group info');
                    return;
                }
            } catch (error) {
                global.logger.error(`Error updating group info: ${error}`);
            }

            // Process different group event types
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
                    // Log other events
                    global.logger.info(`Received other group event: ${data.type} - ${JSON.stringify(data.data)}`);
                    break;
            }

        } catch (error) {
            global.logger.error(`Error processing group event: ${error}`);
        }
    });

    global.logger.info('Group event listener setup complete');
}

/**
 * Handles user join events
 */
async function handleJoinEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleJoinEvent');
            return;
        }

        for (const userId of data.data.userIDs) {
            // Check if the joining user is the bot
            if (global.bot.id === userId) {
                // Bot was just added to the group
                await sendTextMessage(
                    `👋 Hello! I am ${BOT_CONFIG.botName} 🤖\n\n` +
                    `Thank you for adding me to the group. To use my features, ` +
                    `the group needs to activate the service first.\n\n` +
                    `Type "${BOT_CONFIG.prefix}rent" to see service packages and rent the bot.`,
                    groupId,
                    true
                );
                continue;
            }

            // Get user information
            const userInfo = await global.bot.getUserInfo(userId);
            await userService().createOrUpdateUser(userId, userInfo.displayName);

            // Send welcome message
            await sendTextMessage(
                `👋 Welcome ${userInfo.displayName} to the group!`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Error handling join event: ${error}`);
    }
}

/**
 * Handles user leave events
 */
async function handleLeaveEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleLeaveEvent');
            return;
        }

        for (const userId of data.data.userIDs) {
            // Get user information
            const userInfo = await global.bot.getUserInfo(userId);

            // Send notification
            await sendTextMessage(
                `👋 ${userInfo.displayName} has left the group.`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Error handling leave event: ${error}`);
    }
}

/**
 * Handles group update events
 */
async function handleUpdateEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleUpdateEvent');
            return;
        }

        // Check if it's a name update
        if (data.data.update_type === 'name') {
            // Update group name in DB
            const groupInfo = await global.bot.getGroupInfo(groupId);
            await groupService().createOrUpdateGroup(groupId, groupInfo.name);

            // Send notification
            await sendTextMessage(
                `📝 Group name changed to "${groupInfo.name}".`,
                groupId,
                true
            );
        }
        // Check if it's an avatar update
        else if (data.data.update_type === 'avatar') {
            await sendTextMessage(
                `🖼️ Group avatar has been updated.`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Error handling update event: ${error}`);
    }
}

/**
 * Handles admin addition events
 */
async function handleAddAdminEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleAddAdminEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);
        if (data.data.adminType === 1) { // Group owner
            await sendTextMessage(
                `🎖️ ${userInfo.displayName} is now the group owner.`,
                groupId,
                true
            );
        } else { // Group admin
            await sendTextMessage(
                `👮 ${userInfo.displayName} is now a group admin.`,
                groupId,
                true
            );
        }

        // Update user permission in DB
        await userService().createOrUpdateUser(data.data.userID, userInfo.displayName, 'manager');

    } catch (error) {
        global.logger.error(`Error handling add admin event: ${error}`);
    }
}

/**
 * Handles admin removal events
 */
async function handleRemoveAdminEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleRemoveAdminEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);
        await sendTextMessage(
            `👋 ${userInfo.displayName} is no longer a group admin.`,
            groupId,
            true
        );

        // Update user permission in DB
        await userService().createOrUpdateUser(data.data.userID, userInfo.displayName, 'user');

    } catch (error) {
        global.logger.error(`Error handling remove admin event: ${error}`);
    }
}

/**
 * Handles member removal events
 */
async function handleRemoveMemberEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleRemoveMemberEvent');
            return;
        }

        for (const userId of data.data.userIDs) {
            const userInfo = await global.bot.getUserInfo(userId);
            await sendTextMessage(
                `🚫 ${userInfo.displayName} has been removed from the group.`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Error handling remove member event: ${error}`);
    }
}

/**
 * Handles member block events
 */
async function handleBlockMemberEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleBlockMemberEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);
        await sendTextMessage(
            `🔒 ${userInfo.displayName} has been blocked from the group.`,
            groupId,
            true
        );
    } catch (error) {
        global.logger.error(`Error handling block member event: ${error}`);
    }
}

/**
 * Handles join request events
 */
async function handleJoinRequestEvent(data, groupId) {
    try {
        if (!global.bot) {
            global.logger.error('Bot not available in handleJoinRequestEvent');
            return;
        }

        const userInfo = await global.bot.getUserInfo(data.data.userID);

        // Notify group admins
        await sendTextMessage(
            `📩 ${userInfo.displayName} has requested to join the group.`,
            groupId,
            true
        );
    } catch (error) {
        global.logger.error(`Error handling join request event: ${error}`);
    }
}