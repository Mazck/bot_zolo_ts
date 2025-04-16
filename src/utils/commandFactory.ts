import { Command, CommandContext, CommandResult } from '../includes/types/command';
import { TextStyle } from '../includes/types/message';
import { commandRegistry } from './commandRegistry';

/**
 * Factory function để tạo và đăng ký command
 * @param options Các tùy chọn để tạo command
 * @returns Command đã được tạo và đăng ký
 */
export function createCommand(options: {
    name: string;
    description: string;
    aliases?: string[];
    usage?: string;
    category?: string;
    permissions?: string[];
    execute: (context: CommandContext) => Promise<Partial<CommandResult>>;
}) {
    const command: Command = {
        ...options,
        execute: async (context: CommandContext): Promise<CommandResult> => {
            try {
                const result = await options.execute(context);
                return {
                    success: true,
                    message: '',
                    style: TextStyle.DEFAULT,
                    ...result
                };
            } catch (error : any) {
                console.error(`Lỗi khi thực thi lệnh ${options.name}:`, error);
                return {
                    success: false,
                    message: `Đã xảy ra lỗi khi thực thi lệnh: ${error.message || 'Lỗi không xác định'}`,
                    style: TextStyle.ERROR
                };
            }
        }
    };

    // Tự động đăng ký command
    commandRegistry.registerCommand(command);

    return command;
}

// Tạo một helper function để lấy command từ registry
export function getCommand(name: string): Command | undefined {
    return commandRegistry.getCommand(name);
}

// Tạo một helper function để lấy tất cả commands
export function getAllCommands(): Command[] {
    return commandRegistry.getAllCommands();
}

// Export các enum và types cần thiết để sử dụng trong các file command
export { TextStyle };
export type { CommandContext, CommandResult };
