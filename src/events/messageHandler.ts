import { userService, groupService } from '../database/services';
import { BOT_CONFIG } from '../config';
import { commandMiddleware } from '../middlewares/commandMiddleware';
import { sendTextMessage, sendError } from '../utils/messageHelper';
import global from '../global';

/**
 * Sets up the message listener
 */
export function setupMessageListener() {
    if (!global.bot) {
        global.logger.error('Bot not initialized, cannot set up message listener');
        return;
    }

    global.bot.listener.on("message", async (message) => {
        try {
            // Skip self messages
            if (message.isSelf) {
                return;
            }

            // Determine message type (group or personal)
            const isGroup = message.type === 'Group';
            const userId = isGroup ? message.data.senderID : message.threadId;
            const groupId = isGroup ? message.threadId : undefined;

            // Get message content
            const messageContent = message.data.body || '';

            // Update user information
            try {
                if (global.bot) {
                    const userInfo = await global.bot.getUserInfo(userId);
                    await userService().createOrUpdateUser(userId, userInfo.displayName);
                } else {
                    global.logger.error('Bot is null when trying to get user info');
                }
            } catch (error) {
                global.logger.error(`Error updating user info: ${error}`);
            }

            // Update group information if in a group
            if (isGroup && groupId) {
                try {
                    if (global.bot) {
                        const groupInfo = await global.bot.getGroupInfo(groupId);
                        await groupService().createOrUpdateGroup(groupId, groupInfo.name);
                    } else {
                        global.logger.error('Bot is null when trying to get group info');
                    }
                } catch (error) {
                    global.logger.error(`Error updating group info: ${error}`);
                }
            }

            // Process commands
            if (messageContent && messageContent.startsWith(BOT_CONFIG.prefix)) {
                await handleCommand(message, isGroup, groupId, userId, messageContent);
            }

        } catch (error) {
            global.logger.error(`Error processing message: ${error}`);
        }
    });

    global.logger.info('Message listener setup complete');
}

/**
 * Handles command processing from messages
 */
async function handleCommand(message, isGroup, groupId, userId, messageContent) {
    const args = messageContent.slice(BOT_CONFIG.prefix.length).trim().split(/\s+/);
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

        } catch (error) {
            global.logger.error(`Error executing command ${command.name}: ${error}`);

            await sendError(
                `An error occurred while executing "${command.name}". Please try again later.`,
                isGroup && groupId ? groupId : userId,
                !!groupId
            );
        }
    });
}