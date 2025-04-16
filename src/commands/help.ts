import { Command } from '../includes/types/command';
import { createCommand, TextStyle, getAllCommands, getCommand } from '../utils/commandFactory';

createCommand({
    name: 'help',
    description: 'Hiển thị thông tin trợ giúp về các lệnh',
    aliases: ['h', '?'],
    usage: 'help [tên lệnh]',
    category: 'Hệ thống',

    execute: async (context) => {
        const { args, prefix } = context;

        // Nếu có tên lệnh cụ thể, hiển thị thông tin chi tiết về lệnh đó
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const command = getCommand(commandName);

            if (!command) {
                return {
                    success: false,
                    message: `Không tìm thấy lệnh '${commandName}'`,
                    style: TextStyle.ERROR
                };
            }

            let helpMessage = `**${command.name}**\n`;
            helpMessage += `Mô tả: ${command.description}\n`;

            if (command.aliases && command.aliases.length > 0) {
                helpMessage += `Tên thay thế: ${command.aliases.join(", ")}\n`;
            }

            if (command.usage) {
                helpMessage += `Cách sử dụng: ${prefix}${command.usage}\n`;
            }

            if (command.category) {
                helpMessage += `Danh mục: ${command.category}\n`;
            }

            return {
                message: helpMessage,
                style: TextStyle.INFO
            };
        }

        // Nếu không có tên lệnh cụ thể, hiển thị danh sách tất cả các lệnh
        const commands = getAllCommands();

        // Nhóm các lệnh theo danh mục
        const categories = new Map<string, Command[]>();

        commands.forEach(command => {
            const category = command.category || 'Khác';
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(command);
        });

        let helpMessage = '**Danh sách lệnh**\n';
        helpMessage += `Sử dụng \`${prefix}help [tên lệnh]\` để xem thông tin chi tiết về một lệnh cụ thể.\n\n`;

        // Hiển thị lệnh theo danh mục
        categories.forEach((cmds, category) => {
            helpMessage += `**${category}**\n`;
            cmds.forEach(cmd => {
                helpMessage += `\`${cmd.name}\`: ${cmd.description}\n`;
            });
            helpMessage += '\n';
        });

        return {
            message: helpMessage,
            style: TextStyle.INFO
        };
    }
});
