/**
 * File: src/utils/logger.ts
 * Mô tả: Hệ thống ghi log cho ứng dụng
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Tải biến môi trường
dotenv.config();

// Thư mục logs
const logDir = path.join(process.cwd(), 'logs');

// Tạo thư mục logs nếu chưa tồn tại
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Định dạng log
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(
        info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
);

// Cấu hình mức log từ biến môi trường hoặc mặc định
const logLevel = process.env.LOG_LEVEL || 'info';

/**
 * Tạo và cấu hình logger
 * @returns Winston logger đã cấu hình
 */
export function createLogger(): winston.Logger {
    return winston.createLogger({
        level: logLevel,
        format: logFormat,
        defaultMeta: { service: 'zca-bot' },
        transports: [
            // Ghi log lỗi vào file riêng
            new winston.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }),
            // Ghi tất cả log vào file chung
            new winston.transports.File({
                filename: path.join(logDir, 'combined.log'),
                maxsize: 10485760, // 10MB
                maxFiles: 10
            }),
            // Hiển thị log ra console khi không phải môi trường production
            ...(process.env.NODE_ENV !== 'production' ? [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(
                            info => `[${info.timestamp}] ${info.level}: ${info.message}`
                        )
                    )
                })
            ] : [])
        ]
    });
}

// Tạo logger mặc định
const defaultLogger = createLogger();

/**
 * Ghi log cấp độ Info
 * @param message Nội dung log
 * @param meta Dữ liệu bổ sung
 */
export function logInfo(message: string, meta?: any): void {
    defaultLogger.info(message, meta);
}

/**
 * Ghi log cấp độ Debug
 * @param message Nội dung log
 * @param meta Dữ liệu bổ sung
 */
export function logDebug(message: string, meta?: any): void {
    defaultLogger.debug(message, meta);
}

/**
 * Ghi log cấp độ Warning
 * @param message Nội dung log
 * @param meta Dữ liệu bổ sung
 */
export function logWarning(message: string, meta?: any): void {
    defaultLogger.warn(message, meta);
}

/**
 * Ghi log cấp độ Error
 * @param message Nội dung log
 * @param error Error object hoặc dữ liệu bổ sung
 */
export function logError(message: string, error?: any): void {
    if (error instanceof Error) {
        defaultLogger.error(`${message}: ${error.message}`, { stack: error.stack });
    } else {
        defaultLogger.error(message, error);
    }
}

export default {
    createLogger,
    logInfo,
    logDebug,
    logWarning,
    logError
};