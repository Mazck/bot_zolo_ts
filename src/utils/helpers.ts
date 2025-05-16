// src/utils/helpers.ts
import crypto from 'crypto';
import { Command } from '../types';
import global from '../global';

/**
 * Phân tích cú pháp lệnh
 * @param text Nội dung tin nhắn
 * @param prefix Tiền tố lệnh
 * @returns Object chứa lệnh và tham số
 */
export function parseCommand(text: string, prefix: string): { command: string, args: string[] } | null {
    if (!text.startsWith(prefix)) {
        return null;
    }

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase() || '';

    return { command, args };
}

/**
 * Tạo mã UUID ngẫu nhiên
 * @returns Chuỗi UUID
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Tạo mã thanh toán
 * @param prefix Tiền tố
 * @returns Mã thanh toán
 */
export function generatePaymentCode(prefix: string = 'PAYMENT'): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${randomStr}`.toUpperCase();
}

/**
 * Tìm lệnh theo tên hoặc bí danh
 * @param commandName Tên hoặc bí danh lệnh
 * @returns Lệnh tương ứng hoặc undefined
 */
export function findCommand(commandName: string): Command | undefined {
    // Tìm lệnh trực tiếp
    let command = global.commands.get(commandName);

    // Nếu không tìm thấy, kiểm tra bí danh
    if (!command) {
        for (const [name, cmd] of global.commands.entries()) {
            if (cmd.aliases && cmd.aliases.includes(commandName)) {
                command = cmd;
                break;
            }
        }
    }

    return command;
}

/**
 * Định dạng thời gian còn lại
 * @param endDate Thời gian kết thúc
 * @returns Chuỗi định dạng thời gian còn lại
 */
export function formatTimeRemaining(endDate: Date): string {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) {
        return 'Đã hết hạn';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days} ngày ${hours} giờ`;
    } else if (hours > 0) {
        return `${hours} giờ ${minutes} phút`;
    } else {
        return `${minutes} phút`;
    }
}

export default {
    parseCommand,
    generateUUID,
    generatePaymentCode,
    findCommand,
    formatTimeRemaining
};