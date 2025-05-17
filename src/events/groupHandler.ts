import { GroupEventType, ThreadType } from '../types';
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

                    // Process group data from API response
                    if (groupInfo && groupInfo.gridInfoMap && groupInfo.gridInfoMap[groupId]) {
                        const groupData = groupInfo.gridInfoMap[groupId];

                        // Create or update group with detailed information
                        await groupService().createOrUpdateGroup(groupId, groupData.name);

                        // Update additional group details
                        const group = await groupService().findGroupById(groupId);
                        if (group) {
                            group.description = groupData.desc || group.description;
                            group.avatar = groupData.avt || group.avatar;
                            group.creatorId = groupData.creatorId || group.creatorId;
                            group.adminIds = groupData.adminIds || group.adminIds;

                            await groupService().getRepository().save(group);
                            global.logger.debug(`Updated group details for ${groupData.name} (${groupId})`);
                        }
                    } else {
                        await groupService().createOrUpdateGroup(groupId, `Group_${groupId.substring(0, 8)}`);
                    }
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

        // Check if userIDs exists and is an array
        if (!data.data || !data.data.userIDs || !Array.isArray(data.data.userIDs)) {
            global.logger.error(`Invalid join event data: ${JSON.stringify(data)}`);
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

            try {
                // Get user information
                const userInfo = await global.bot.getUserInfo(userId);

                // Process user data from API response
                let displayName = `User_${userId.substring(0, 8)}`;
                if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                    const profile = userInfo.changed_profiles[userId];
                    displayName = profile.displayName || profile.zaloName || displayName;

                    // Update user in database with detailed information
                    await userService().createOrUpdateUser(userId, displayName);

                    // Update additional user details
                    const user = await userService().findUserById(userId);
                    if (user) {
                        user.username = profile.username || user.username;
                        user.zaloName = profile.zaloName || user.zaloName;
                        user.displayName = profile.displayName || user.displayName;
                        user.avatar = profile.avatar || user.avatar;
                        user.gender = profile.gender !== undefined ? profile.gender : user.gender;
                        user.phoneNumber = profile.phoneNumber || user.phoneNumber;
                        user.lastActive = new Date(profile.lastActionTime || Date.now());

                        await userService().getRepository().save(user);
                    }
                } else {
                    // Fallback if detailed info not available
                    await userService().createOrUpdateUser(userId, displayName);
                }

                // Send welcome message
                await sendTextMessage(
                    `👋 Welcome ${displayName} to the group!`,
                    groupId,
                    true
                );
            } catch (userError) {
                global.logger.error(`Error processing user ${userId} join: ${userError}`);

                // Try to send welcome message with generic name
                await sendTextMessage(
                    `👋 Welcome to the group!`,
                    groupId,
                    true
                );
            }
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

        // Check if userIDs exists and is an array
        if (!data.data || !data.data.userIDs || !Array.isArray(data.data.userIDs)) {
            global.logger.error(`Invalid leave event data: ${JSON.stringify(data)}`);
            return;
        }

        for (const userId of data.data.userIDs) {
            try {
                // Try to get user information
                const userInfo = await global.bot.getUserInfo(userId);

                // Process user data from API response
                let displayName = `User_${userId.substring(0, 8)}`;
                if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                    const profile = userInfo.changed_profiles[userId];
                    displayName = profile.displayName || profile.zaloName || displayName;
                } else {
                    // Try to get from database if API fails
                    const user = await userService().findUserById(userId);
                    if (user && user.displayName) {
                        displayName = user.displayName;
                    }
                }

                // Send notification
                await sendTextMessage(
                    `👋 ${displayName} has left the group.`,
                    groupId,
                    true
                );
            } catch (userError) {
                global.logger.error(`Error processing user ${userId} leave: ${userError}`);

                // Try to send notification with generic message
                await sendTextMessage(
                    `👋 A user has left the group.`,
                    groupId,
                    true
                );
            }
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

        // Check if update_type exists
        if (!data.data || !data.data.update_type) {
            global.logger.error(`Invalid update event data: ${JSON.stringify(data)}`);
            return;
        }

        // Check if it's a name update
        if (data.data.update_type === 'name') {
            try {
                // Update group name in DB
                const groupInfo = await global.bot.getGroupInfo(groupId);
                let groupName = `Group_${groupId.substring(0, 8)}`;

                if (groupInfo && groupInfo.gridInfoMap && groupInfo.gridInfoMap[groupId]) {
                    groupName = groupInfo.gridInfoMap[groupId].name || groupName;
                }

                await groupService().createOrUpdateGroup(groupId, groupName);

                // Send notification
                await sendTextMessage(
                    `📝 Group name changed to "${groupName}".`,
                    groupId,
                    true
                );
            } catch (nameError) {
                global.logger.error(`Error updating group name: ${nameError}`);

                // Send generic notification
                await sendTextMessage(
                    `📝 Group name has been updated.`,
                    groupId,
                    true
                );
            }
        }
        // Check if it's an avatar update
        else if (data.data.update_type === 'avatar') {
            await sendTextMessage(
                `🖼️ Group avatar has been updated.`,
                groupId,
                true
            );
        } else {
            global.logger.info(`Unhandled group update type: ${data.data.update_type}`);
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

        // Check if userID exists
        if (!data.data || !data.data.userID) {
            global.logger.error(`Invalid add admin event data: ${JSON.stringify(data)}`);
            return;
        }

        const userId = data.data.userID;
        try {
            // Get user information
            const userInfo = await global.bot.getUserInfo(userId);

            // Process user data from API response
            let displayName = `User_${userId.substring(0, 8)}`;
            if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                const profile = userInfo.changed_profiles[userId];
                displayName = profile.displayName || profile.zaloName || displayName;

                // Update user in database
                await userService().createOrUpdateUser(userId, displayName, 'manager');
            } else {
                // Fallback if detailed info not available
                await userService().createOrUpdateUser(userId, displayName, 'manager');
            }

            // Determine admin type message
            if (data.data.adminType === 1) { // Group owner
                await sendTextMessage(
                    `🎖️ ${displayName} is now the group owner.`,
                    groupId,
                    true
                );
            } else { // Group admin
                await sendTextMessage(
                    `👮 ${displayName} is now a group admin.`,
                    groupId,
                    true
                );
            }
        } catch (userError) {
            global.logger.error(`Error processing admin add for user ${userId}: ${userError}`);

            // Try to send generic notification
            if (data.data.adminType === 1) {
                await sendTextMessage(
                    `🎖️ A new group owner has been assigned.`,
                    groupId,
                    true
                );
            } else {
                await sendTextMessage(
                    `👮 A new group admin has been added.`,
                    groupId,
                    true
                );
            }
        }
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

        // Check if userID exists
        if (!data.data || !data.data.userID) {
            global.logger.error(`Invalid remove admin event data: ${JSON.stringify(data)}`);
            return;
        }

        const userId = data.data.userID;
        try {
            // Get user information
            const userInfo = await global.bot.getUserInfo(userId);

            // Process user data from API response
            let displayName = `User_${userId.substring(0, 8)}`;
            if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                const profile = userInfo.changed_profiles[userId];
                displayName = profile.displayName || profile.zaloName || displayName;

                // Update user in database
                await userService().createOrUpdateUser(userId, displayName, 'user');
            } else {
                // Fallback if detailed info not available
                await userService().createOrUpdateUser(userId, displayName, 'user');
            }

            await sendTextMessage(
                `👋 ${displayName} is no longer a group admin.`,
                groupId,
                true
            );
        } catch (userError) {
            global.logger.error(`Error processing admin removal for user ${userId}: ${userError}`);

            // Try to send generic notification
            await sendTextMessage(
                `👋 A group admin has been removed.`,
                groupId,
                true
            );
        }
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

        // Check if userIDs exists and is an array
        if (!data.data || !data.data.userIDs || !Array.isArray(data.data.userIDs)) {
            global.logger.error(`Invalid remove member event data: ${JSON.stringify(data)}`);
            return;
        }

        for (const userId of data.data.userIDs) {
            try {
                // Get user information
                const userInfo = await global.bot.getUserInfo(userId);

                // Process user data from API response
                let displayName = `User_${userId.substring(0, 8)}`;
                if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                    const profile = userInfo.changed_profiles[userId];
                    displayName = profile.displayName || profile.zaloName || displayName;
                } else {
                    // Try to get from database if API fails
                    const user = await userService().findUserById(userId);
                    if (user && user.displayName) {
                        displayName = user.displayName;
                    }
                }

                await sendTextMessage(
                    `🚫 ${displayName} has been removed from the group.`,
                    groupId,
                    true
                );
            } catch (userError) {
                global.logger.error(`Error processing member removal for user ${userId}: ${userError}`);

                // Try to send generic notification
                await sendTextMessage(
                    `🚫 A member has been removed from the group.`,
                    groupId,
                    true
                );
            }
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

        // Check if userID exists
        if (!data.data || !data.data.userID) {
            global.logger.error(`Invalid block member event data: ${JSON.stringify(data)}`);
            return;
        }

        const userId = data.data.userID;
        try {
            // Get user information
            const userInfo = await global.bot.getUserInfo(userId);

            // Process user data from API response
            let displayName = `User_${userId.substring(0, 8)}`;
            if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                const profile = userInfo.changed_profiles[userId];
                displayName = profile.displayName || profile.zaloName || displayName;
            } else {
                // Try to get from database if API fails
                const user = await userService().findUserById(userId);
                if (user && user.displayName) {
                    displayName = user.displayName;
                }
            }

            await sendTextMessage(
                `🔒 ${displayName} has been blocked from the group.`,
                groupId,
                true
            );
        } catch (userError) {
            global.logger.error(`Error processing member block for user ${userId}: ${userError}`);

            // Try to send generic notification
            await sendTextMessage(
                `🔒 A member has been blocked from the group.`,
                groupId,
                true
            );
        }
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

        // Check if userID exists
        if (!data.data || !data.data.userID) {
            global.logger.error(`Invalid join request event data: ${JSON.stringify(data)}`);
            return;
        }

        const userId = data.data.userID;
        try {
            // Get user information
            const userInfo = await global.bot.getUserInfo(userId);

            // Process user data from API response
            let displayName = `User_${userId.substring(0, 8)}`;
            if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                const profile = userInfo.changed_profiles[userId];
                displayName = profile.displayName || profile.zaloName || displayName;
            } else {
                // Try to get from database if API fails
                const user = await userService().findUserById(userId);
                if (user && user.displayName) {
                    displayName = user.displayName;
                }
            }

            // Notify group admins
            await sendTextMessage(
                `📩 ${displayName} has requested to join the group.`,
                groupId,
                true
            );
        } catch (userError) {
            global.logger.error(`Error processing join request for user ${userId}: ${userError}`);

            // Try to send generic notification
            await sendTextMessage(
                `📩 Someone has requested to join the group.`,
                groupId,
                true
            );
        }
    } catch (error) {
        global.logger.error(`Error handling join request event: ${error}`);
    }
}