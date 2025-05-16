/**
 * File: src/commands/index.ts
 * Mô tả: Quản lý và đăng ký các lệnh của bot
 */

import helpCommand from './help';
// import rentCommand from './rent';
// import extendCommand from './extend';
// import statusCommand from './status';
// import groupinfoCommand from './groupinfo';
import global from '../global';
import { Command } from '../types'; // Import the Command interface
import { UserPermission } from '../config'; // Import UserPermission enum

/**
 * Đăng ký các lệnh cho bot
 */
export function registerCommands() {
    // Khởi tạo Map để lưu trữ lệnh
    if (!global.commands) {
        global.commands = new Map<string, Command>(); // Add type to the Map
    }

    // Danh sách các lệnh
    const commands = [
        helpCommand,
        // rentCommand,
        // extendCommand,
        // statusCommand,
        // groupinfoCommand
        // Thêm lệnh mới ở đây
    ];

    // Đăng ký từng lệnh
    for (const command of commands) {
        global.commands.set(command.name, command);
        global.logger.debug(`Đã đăng ký lệnh: ${command.name}`);
    }

    global.logger.info(`Đã đăng ký ${commands.length} lệnh`);

    return commands.length;
}

/**
 * Lấy thông tin về một lệnh cụ thể
 * @param commandName Tên lệnh hoặc bí danh
 * @returns Thông tin lệnh hoặc null nếu không tìm thấy
 */
export function getCommand(commandName: string): Command | null {
    if (!commandName || !global.commands) return null;

    // Chuẩn hóa tên lệnh
    const normalizedName = commandName.toLowerCase();

    // Tìm lệnh trực tiếp
    let command = global.commands.get(normalizedName);

    // Nếu không tìm thấy, tìm kiếm qua bí danh
    if (!command) {
        for (const [name, cmd] of global.commands.entries()) {
            if (cmd.aliases && cmd.aliases.includes(normalizedName)) {
                command = cmd;
                break;
            }
        }
    }

    // Return null if command is undefined
    return command || null;
}

/**
 * Lấy danh sách tất cả các lệnh
 * @returns Mảng các lệnh
 */
export function getAllCommands(): Command[] {
    if (!global.commands) return [];

    return Array.from(global.commands.values());
}

/**
 * Lấy danh sách lệnh theo quyền
 * @param permission Quyền người dùng
 * @returns Mảng các lệnh có quyền tương ứng
 */
export function getCommandsByPermission(permission: UserPermission): Command[] {
    if (!global.commands) return [];

    return Array.from(global.commands.values())
        .filter(cmd => {
            // Nếu là admin, hiển thị tất cả
            if (permission === UserPermission.ADMIN) return true;

            // Nếu là manager, hiển thị lệnh manager và user
            if (permission === UserPermission.MANAGER) {
                return cmd.requiredPermission === UserPermission.MANAGER || cmd.requiredPermission === UserPermission.USER;
            }

            // Nếu là user, chỉ hiển thị lệnh user
            return cmd.requiredPermission === UserPermission.USER;
        });
}