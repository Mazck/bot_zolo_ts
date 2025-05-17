/**
 * File: src/commands/help.ts
 * Mô tả: Lệnh trợ giúp
 */

import { CommandParams } from '../types';
import { getCommand, getAllCommands, getCommandsByPermission } from './index';
import { UserPermission } from '../config';
import { sendTextMessage } from '../utils/messageHelper';

// Helper function to check permission level
function hasPermission(userPerm: UserPermission, requiredPerm: UserPermission): boolean {
    // If the user is ADMIN, they have access to everything
    if (userPerm === UserPermission.ADMIN) return true;

    // If the user is MANAGER, they have access to MANAGER and USER permissions
    if (userPerm === UserPermission.MANAGER) {
        return requiredPerm === UserPermission.MANAGER || requiredPerm === UserPermission.USER;
    }

    // If the user is USER, they only have access to USER permissions
    return requiredPerm === UserPermission.USER;
}

const helpCommand = {
    name: 'help',
    aliases: ['h', 'guide', 'commands'],
    description: 'Hiển thị trợ giúp về các lệnh',
    usage: '/help [tên_lệnh]',
    requiredPermission: UserPermission.USER,

    execute: async (params: CommandParams) => {
        const { args, groupId, isGroup, userId } = params;
        console.log(isGroup)
        const targetId = isGroup ? groupId || userId : userId;

        // Nếu có tên lệnh được chỉ định, hiển thị thông tin chi tiết về lệnh đó
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const command = getCommand(commandName);

            if (!command) {
                await sendTextMessage(
                    `❌ Không tìm thấy lệnh: ${commandName}`,
                    targetId,
                    isGroup
                );
                return;
            }

            // Hiển thị thông tin chi tiết về lệnh
            const helpText = `📚 THÔNG TIN LỆNH: ${command.name.toUpperCase()}\n\n` +
                `📝 Mô tả: ${command.description}\n` +
                `🔧 Cách dùng: ${command.usage}\n` +
                (command.aliases && command.aliases.length > 0 ?
                    `🔄 Bí danh: ${command.aliases.join(', ')}\n` : '') +
                `👤 Quyền hạn: ${command.requiredPermission}`;

            await sendTextMessage(
                helpText,
                targetId,
                isGroup
            );
            return;
        }

        // Hiển thị danh sách tất cả các lệnh
        // Giả sử người dùng có quyền USER - trong thực tế bạn cần kiểm tra quyền thực sự
        const userPermission = UserPermission.USER;
        const commands = getCommandsByPermission(userPermission);

        let helpText = `📋 DANH SÁCH LỆNH\n\n`;

        // Nhóm lệnh theo quyền
        const groupedCommands = {
            user: commands.filter(cmd => cmd.requiredPermission === UserPermission.USER),
            manager: commands.filter(cmd => cmd.requiredPermission === UserPermission.MANAGER),
            admin: commands.filter(cmd => cmd.requiredPermission === UserPermission.ADMIN)
        };

        // Hiển thị lệnh người dùng
        if (groupedCommands.user.length > 0) {
            helpText += `👤 LỆNH NGƯỜI DÙNG:\n`;
            groupedCommands.user.forEach(cmd => {
                helpText += `▪️ ${cmd.name} - ${cmd.description}\n`;
            });
            helpText += `\n`;
        }

        // Hiển thị lệnh quản lý nếu người dùng có quyền
        if (hasPermission(userPermission, UserPermission.MANAGER)) {
            if (groupedCommands.manager.length > 0) {
                helpText += `👨‍💼 LỆNH QUẢN LÝ:\n`;
                groupedCommands.manager.forEach(cmd => {
                    helpText += `▪️ ${cmd.name} - ${cmd.description}\n`;
                });
                helpText += `\n`;
            }
        }

        // Hiển thị lệnh admin nếu người dùng là admin
        if (hasPermission(userPermission, UserPermission.ADMIN)) {
            if (groupedCommands.admin.length > 0) {
                helpText += `👑 LỆNH ADMIN:\n`;
                groupedCommands.admin.forEach(cmd => {
                    helpText += `▪️ ${cmd.name} - ${cmd.description}\n`;
                });
            }
        }

        helpText += `\n📌 Gõ "/help [tên_lệnh]" để xem thông tin chi tiết về lệnh cụ thể`;

        await sendTextMessage(
            helpText,
            targetId,
            isGroup
        );
    }
};

export default helpCommand;