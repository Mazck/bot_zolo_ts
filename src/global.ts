/**
 * File: src/global.ts
 * Mô tả: Biến toàn cục sử dụng trong toàn bộ ứng dụng
 */

import { Logger } from 'winston';
import { Connection } from 'typeorm';
import { createLogger } from './utils/logger';

// Khai báo kiểu dữ liệu cho biến toàn cục
interface Global {
    bot: any | null;                  // Instance của Zalo API
    db: Connection | null;            // Kết nối cơ sở dữ liệu
    logger: Logger;                   // Logger
    commands: Map<string, any>;       // Danh sách lệnh
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
    commands: new Map(),
    config: {
        startTime: new Date(),
        processId: `zca-bot-${Date.now().toString(36)}`,
        environment: process.env.NODE_ENV || 'development',
        isReady: false
    }
};

export default global;