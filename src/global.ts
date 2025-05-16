import { Logger } from 'winston';
import { Connection } from 'typeorm';
import { createLogger } from './utils/logger';
import { Command } from './types'; // Import Command interface

// Define ZaloAPI interface locally
export interface ZaloAPI {
    id?: string; // Make id optional
    listener: {
        start(): void;
        stop(): void;
        on(event: string, callback: (data: any) => void): void;
    };
    getUserInfo(userId: string): Promise<any>;
    getGroupInfo(groupId: string): Promise<any>;
    sendMessage(content: any, threadId: string, threadType: any): Promise<any>;
    // Add other methods as needed
    [key: string]: any;
}

// Khai báo kiểu dữ liệu cho biến toàn cục
interface Global {
    bot: ZaloAPI | null;              // Instance của Zalo API
    db: Connection | null;            // Kết nối cơ sở dữ liệu
    logger: Logger;                   // Logger
    commands: Map<string, Command>;   // Update to use the Command interface
    config: {                         // Cấu hình runtime
        startTime: Date;                // Thời điểm khởi động
        processId: string;              // ID process
        environment: string;            // Môi trường (development/production)
        isReady: boolean;               // Trạng thái sẵn sàng của bot
    };
}

// Khởi tạo giá trị mặc định
const global: Global = {
    bot: null,
    db: null,
    logger: createLogger(),
    commands: new Map<string, Command>(),
    config: {
        startTime: new Date(),
        processId: `zca-bot-${Date.now().toString(36)}`,
        environment: process.env.NODE_ENV || 'development',
        isReady: false
    }
};

export default global;