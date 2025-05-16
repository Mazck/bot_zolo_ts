import { addCommandUsage, isUserSpamming } from '../database/models/commandTracker';
import global from '../global';

// Cấu hình chống spam
const SPAM_CONFIG = {
    // Số lệnh tối đa trong khoảng thời gian
    maxCommands: 5,
    // Khoảng thời gian (milliseconds) - 10 giây
    timeWindow: 10 * 1000,
    // Thời gian cooldown khi phát hiện spam (milliseconds) - 60 giây
    cooldownTime: 60 * 1000,
    // Các lệnh không áp dụng chống spam
    excludedCommands: ['help', 'status']
};

/**
 * Kiểm tra chống spam lệnh
 * 
 * @param userId ID người dùng
 * @param command Thông tin lệnh
 * @returns true nếu không phải spam, false nếu đang spam
 */
export async function antiSpamCheck(userId, command) {
    try {
        // Nếu lệnh được loại trừ khỏi kiểm tra spam
        if (SPAM_CONFIG.excludedCommands.includes(command.name)) {
            return true;
        }

        // Kiểm tra người dùng có đang spam không
        const isSpamming = await isUserSpamming(
            userId,
            SPAM_CONFIG.maxCommands,
            SPAM_CONFIG.timeWindow,
            SPAM_CONFIG.cooldownTime
        );

        if (isSpamming) {
            global.logger.warn(`Phát hiện spam từ người dùng ${userId} với lệnh ${command.name}`);
            return false;
        }

        // Thêm lượt sử dụng lệnh mới
        await addCommandUsage(userId, command.name);
        return true;

    } catch (error) {
        global.logger.error(`Lỗi kiểm tra chống spam cho người dùng ${userId}: ${error}`);
        return true; // Cho phép nếu có lỗi để tránh chặn người dùng vô cớ
    }
}