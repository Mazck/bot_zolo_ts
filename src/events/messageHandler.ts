import { userService, groupService } from '../database/services';
import { commandTrackingService } from '../database/services';
import { BOT_CONFIG } from '../config';
import { commandMiddleware } from '../middlewares/commandMiddleware';
import { sendTextMessage, sendError } from '../utils/messageHelper';
import global from '../global';
import { ThreadType } from '../types';

/**
 * Sets up the message listener
 */
export function setupMessageListener() {
    if (!global.bot) {
        global.logger.error('Bot not initialized, cannot set up message listener');
        return;
    }

    global.bot.listener.on("message", async (message) => {
        await processMessage(message);
    });

    global.logger.info('Message listener setup complete');
}

/**
 * Processes a message from Zalo
 * @param message Message object from Zalo
 */
async function processMessage(message: any): Promise<void> {
    try {
        // Skip self messages
        if (message.isSelf) {
            return;
        }

        // Determine message type (group or personal)
        const isGroup = message.type === 1; // type 1 is for Group
        const threadId = message.threadId; // ID of the group or user
        const userId = isGroup ? message.data.uidFrom : message.threadId; // Sender ID
        const messageId = message.data.msgId; // Message ID
        const content = message.data.content || ''; // Message content
        const timestamp = Number(message.data.ts); // Timestamp
        const displayName = message.data.dName || ''; // Display name of sender

        global.logger.debug(`Received message from ${displayName} (${userId}): ${content}`);

        // Update user and group information
        try {
            await updateUserFromMessage(userId, displayName);

            if (isGroup) {
                await updateGroupFromMessage(threadId, "Group Chat");
            }
        } catch (updateError) {
            global.logger.error(`Error updating user/group info: ${updateError}`);
        }

        // Process commands
        if (content && content.startsWith(BOT_CONFIG.prefix)) {
            await handleCommand(message, isGroup, threadId, userId, content);
        }

        // Update message statistics
        try {
            await updateMessageStats(userId, threadId, isGroup);
        } catch (statsError) {
            global.logger.error(`Error updating message stats: ${statsError}`);
        }

    } catch (error) {
        global.logger.error(`Error processing message: ${error}`);
    }
}

/**
 * Updates user information from a message
 * @param userId User ID
 * @param displayName Display name (if available from message)
 */
async function updateUserFromMessage(userId: string, displayName: string): Promise<void> {
    try {
        if (!global.bot) {
            return;
        }

        // First try to get detailed user info
        try {
            const userInfo = await global.bot.getUserInfo(userId);

            // Process user data from the API response
            if (userInfo && userInfo.changed_profiles && userInfo.changed_profiles[userId]) {
                const profile = userInfo.changed_profiles[userId];

                // Create or update user with detailed information
                await userService().createOrUpdateUser(userId, profile.displayName || profile.zaloName);

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
                    global.logger.debug(`Updated user details for ${profile.displayName} (${userId})`);
                }
            } else {
                // Fallback if detailed info not available
                await userService().createOrUpdateUser(userId, displayName || `User_${userId.substring(0, 8)}`);
            }
        } catch (apiError) {
            // If API call fails, just update with basic info from message
            global.logger.warn(`Could not get detailed user info: ${apiError}`);
            await userService().createOrUpdateUser(userId, displayName || `User_${userId.substring(0, 8)}`);
        }
    } catch (error) {
        global.logger.error(`Error updating user from message: ${error}`);
    }
}

/**
 * Updates group information from a message
 * @param groupId Group ID
 * @param groupName Group name (if available from message)
 */
async function updateGroupFromMessage(groupId: string, groupName: string): Promise<void> {
    try {
        if (!global.bot) {
            return;
        }

        // Try to get detailed group info
        try {
            const groupInfo = await global.bot.getGroupInfo(groupId);

            // Process group data from the API response
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

                    // Process group members if needed
                    await updateGroupMembers(groupId, groupData);
                }
            } else {
                // Fallback if detailed info not available
                await groupService().createOrUpdateGroup(groupId, groupName || `Group_${groupId.substring(0, 8)}`);
            }
        } catch (apiError) {
            // If API call fails, just update with basic info from message
            global.logger.warn(`Could not get detailed group info: ${apiError}`);
            await groupService().createOrUpdateGroup(groupId, groupName || `Group_${groupId.substring(0, 8)}`);
        }
    } catch (error) {
        global.logger.error(`Error updating group from message: ${error}`);
    }
}

/**
 * Updates group members information
 * @param groupId Group ID
 * @param groupData Group data from API
 */
async function updateGroupMembers(groupId: string, groupData: any): Promise<void> {
    try {
        // Get member list
        let memberIds: string[] = [];

        if (groupData.memVerList && groupData.memVerList.length > 0) {
            // Format: "userId:version"
            memberIds = groupData.memVerList.map((item: string) => item.split(':')[0]);
        } else if (groupData.memberIds && groupData.memberIds.length > 0) {
            memberIds = groupData.memberIds;
        } else if (groupData.currentMems && groupData.currentMems.length > 0) {
            memberIds = groupData.currentMems;
        }

        if (memberIds.length === 0) {
            global.logger.debug(`No member information found for group ${groupId}`);
            return;
        }

        global.logger.debug(`Found ${memberIds.length} members for group ${groupId}`);

        // Process each member
        // Implement if needed - here we would typically update GroupUser records
        // This would require a groupUserService that may not be implemented yet
    } catch (error) {
        global.logger.error(`Error updating group members: ${error}`);
    }
}

/**
 * Updates message statistics
 * @param userId User ID
 * @param groupId Group ID (if applicable)
 * @param isGroup Is this a group message
 */
async function updateMessageStats(userId: string, groupId: string, isGroup: boolean): Promise<void> {
    try {
        // Update user statistics
        await userService().updateUserStats(userId);

        // Update group statistics if this is a group message
        if (isGroup) {
            await groupService().updateGroupStats(groupId);
        }
    } catch (error) {
        global.logger.error(`Error updating message stats: ${error}`);
    }
}

/**
 * Handles commands from messages
 */
async function handleCommand(message: any, isGroup: boolean, groupId: string, userId: string, content: string): Promise<void> {
    try {
        const args = content.slice(BOT_CONFIG.prefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        // Find matching command
        let command = global.commands.get(commandName);

        // Check aliases if no direct match
        if (!command) {
            for (const [name, cmd] of global.commands.entries()) {
                if (cmd.aliases && cmd.aliases.includes(commandName)) {
                    command = cmd;
                    break;
                }
            }
        }

        if (!command) {
            global.logger.info(`User ${userId} used non-existent command: ${commandName}`);
            return;
        }

        // Prepare middleware parameters
        const params = {
            message: message.data,
            args,
            userId,
            groupId,
            isGroup,
            command
        };

        // Process command through middleware
        await commandMiddleware(params, async () => {
            try {
                // Execute command after passing all checks
                global.logger.info(`User ${userId} executing command ${command.name} with args: ${args.join(' ')}`);

                await command.execute({
                    message: message.data,
                    args,
                    userId,
                    groupId,
                    isGroup
                });

                // Track command usage
                await commandTrackingService().addCommandUsage(userId, command.name);

            } catch (error) {
                global.logger.error(`Error executing command ${command.name}: ${error}`);

                await sendError(
                    `An error occurred while executing "${command.name}". Please try again later.`,
                    isGroup && groupId ? groupId : userId,
                    !!groupId
                );
            }
        });
    } catch (error) {
        global.logger.error(`Error handling command: ${error}`);
    }
}