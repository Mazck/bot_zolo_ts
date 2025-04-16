import { Command } from '../includes/types/command';

/**
 * Lớp quản lý các command
 */
class CommandRegistry {
    private commands: Map<string, Command> = new Map();
    private aliases: Map<string, string> = new Map();

    /**
     * Đăng ký một command mới
     * @param command Command cần đăng ký
     */
    registerCommand(command: Command): void {
        // Kiểm tra command đã tồn tại chưa
        if (this.commands.has(command.name)) {
            throw new Error(`Command với tên "${command.name}" đã tồn tại`);
        }

        // Đăng ký command
        this.commands.set(command.name.toLowerCase(), command);

        // Đăng ký aliases nếu có
        if (command.aliases) {
            for (const alias of command.aliases) {
                if (this.aliases.has(alias) || this.commands.has(alias)) {
                    console.warn(`Alias "${alias}" cho command "${command.name}" đã được sử dụng, sẽ bị bỏ qua`);
                    continue;
                }
                this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
            }
        }
    }

    /**
     * Lấy command theo tên hoặc alias
     * @param name Tên hoặc alias của command
     * @returns Command nếu tìm thấy, undefined nếu không
     */
    getCommand(name: string): Command | undefined {
        name = name.toLowerCase();

        // Kiểm tra xem có phải là command trực tiếp không
        if (this.commands.has(name)) {
            return this.commands.get(name);
        }

        // Kiểm tra xem có phải là alias không
        const commandName = this.aliases.get(name);
        if (commandName) {
            return this.commands.get(commandName);
        }

        return undefined;
    }

    /**
     * Lấy tất cả các command đã đăng ký
     * @returns Danh sách các command
     */
    getAllCommands(): Command[] {
        return Array.from(this.commands.values());
    }
}

// Export một instance singleton
export const commandRegistry = new CommandRegistry();
