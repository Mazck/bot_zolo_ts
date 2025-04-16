import { CommandContext } from '../../includes/types/command';
import { commandRegistry } from '../../utils/commandRegistry';
import { MessageHandler } from './messageHandler';
import { ThreadType } from '../types/message';

/**
 * Xử lý các lệnh từ người dùng
 */
export class CommandHandler {
    private prefix: string;
    private messageHandler: MessageHandler;

    /**
     * Khởi tạo handler lệnh
     * @param messageHandler Instance của MessageHandler để gửi phản hồi
     * @param prefix Tiền tố cho lệnh, mặc định là '!'
     */
    constructor(messageHandler: MessageHandler, prefix: string = '!') {
        this.prefix = prefix;
        this.messageHandler = messageHandler;
        
    }

    /**
     * Xử lý tin nhắn và kiểm tra xem có phải là lệnh không
     * @param message Tin nhắn cần xử lý
     * @returns true nếu tin nhắn là lệnh và đã được xử lý, false nếu không phải
     */
    async handleMessage(message: any): Promise<boolean> {
        // Kiểm tra xem tin nhắn có bắt đầu bằng prefix không
        if (!message.data?.content || !message.data.content.startsWith(this.prefix)) {
            return false;
        }

        // Tách nội dung tin nhắn thành các phần
        const args = message.data.content.slice(this.prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) {
            return false;
        }

        // Tìm lệnh trong registry
        const command = commandRegistry.getCommand(commandName);
        if (!command) {
            return false;
        }

        // Tạo context cho lệnh
        const context: CommandContext = {
            message,
            args,
            prefix: this.prefix,
            sender: message.sender || { id: message.senderID || '' },
            senderId: message.senderID || (message.sender?.id || ''),
            threadId: message.threadId || message.threadID || '',
            threadType: message.type || ThreadType.User,
            messageHandler: this.messageHandler
        };

        try {
            // Thực thi lệnh
            const result = await command.execute(context);

            // Xử lý kết quả
            if (result?.message) {
                await this.sendResponse(message, result);
            }

            return true;
        } catch (error) {
            await this.sendErrorResponse(message, error);
            return true;
        }
    }

    /**
     * Gửi phản hồi cho lệnh
     * @param message Tin nhắn gốc
     * @param result Kết quả của lệnh
     */
    private async sendResponse(message: any, result: any): Promise<void> {
        try {
            // Sử dụng MessageHandler để gửi tin nhắn phản hồi
            if (result.isReply) {
                // Gửi tin nhắn trả lời
                await this.messageHandler.sendReply(result.message, message);
            } else {
                // Gửi tin nhắn thông thường
                const options = {
                    msg: result.message,
                    styles: result.styles,
                    mentions: result.mentions,
                    attachments: result.attachments
                };

                await this.messageHandler.sendMessage(
                    options,
                    message.threadId || message.threadID || '',
                    message.type || ThreadType.User
                );
            }
        } catch (error: any) {
            throw new Error(`Lỗi khi gửi phản hồi: ${error.message || 'Lỗi không xác định'}`);
        }
    }

    /**
     * Gửi thông báo lỗi
     * @param message Tin nhắn gốc
     * @param error Lỗi xảy ra
     */
    private async sendErrorResponse(message: any, error: any): Promise<void> {
        try {
            const errorMsg = `❌ Đã xảy ra lỗi: ${error.message || 'Lỗi không xác định'}`;
            await this.messageHandler.sendReply(errorMsg, message);
        } catch (error: any) {
            throw new Error(`Lỗi khi gửi thông báo lỗi: ${error.message || 'Lỗi không xác định'}`);
        }
    }
}