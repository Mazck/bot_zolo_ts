import { TextStyle } from './message';
import { MessageHandler } from '../handlers/messageHandler';

/**
 * Interface cho kết quả trả về của command
 */
export interface CommandResult {
    success: boolean;
    message: string;
    style: TextStyle;
    data?: any;
}

/**
 * Interface cho context của command
 */
export interface CommandContext {
    // Tin nhắn gốc
    message: any;
    // Các tham số của lệnh
    args: string[];
    // Tiền tố lệnh
    prefix: string;
    // Thông tin người gửi
    sender: {
        id: string;
        name?: string;
    };
    // ID của người gửi (để tương thích với mã hiện tại)
    senderId: string;
    // ID của thread
    threadId: string;
    // Loại thread (nhóm/cá nhân)
    threadType: string;
    // Handler để gửi tin nhắn
    messageHandler: MessageHandler;
}

/**
 * Interface cho command
 */
export interface Command {
    name: string;
    description: string;
    aliases?: string[];
    usage?: string;
    category?: string;
    permissions?: string[];
    execute: (context: CommandContext) => Promise<CommandResult>;
}
