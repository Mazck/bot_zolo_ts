/**
 * File: src/database/models/commandTracker.ts
 * Mô tả: Model và hàm xử lý theo dõi lệnh (chống spam)
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { LessThan, MoreThanOrEqual } from 'typeorm'; // Import TypeORM operators
import global from '../../global';

@Entity('command_usage')
export class CommandUsage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @Column()
    commandName: string;

    @CreateDateColumn()
    @Index()
    usedAt: Date;
}

/**
 * Thêm lượt sử dụng lệnh mới vào cơ sở dữ liệu
 * 
 * @param userId ID người dùng
 * @param commandName Tên lệnh
 * @returns Thông tin lượt sử dụng đã thêm
 */
export async function addCommandUsage(userId: string, commandName: string): Promise<CommandUsage | null> {
    try {
        if (!global.db) return null;

        const commandUsageRepo = global.db.getRepository(CommandUsage);

        const usage = commandUsageRepo.create({
            userId,
            commandName
        });

        return await commandUsageRepo.save(usage);
    } catch (error) {
        global.logger.error(`Lỗi thêm lượt sử dụng lệnh: ${error}`);
        return null;
    }
}

/**
 * Kiểm tra người dùng có đang spam không
 * 
 * @param userId ID người dùng
 * @param maxCommands Số lệnh tối đa trong khoảng thời gian
 * @param timeWindow Khoảng thời gian (milliseconds)
 * @param cooldownTime Thời gian cooldown (milliseconds)
 * @returns true nếu đang spam, false nếu không
 */
export async function isUserSpamming(
    userId: string,
    maxCommands: number,
    timeWindow: number,
    cooldownTime: number
): Promise<boolean> {
    try {
        if (!global.db) return false;

        const commandUsageRepo = global.db.getRepository(CommandUsage);

        // Tính thời điểm bắt đầu khoảng thời gian kiểm tra
        const timeWindowStart = new Date(Date.now() - timeWindow);

        // Đếm số lệnh trong khoảng thời gian
        const count = await commandUsageRepo.count({
            where: {
                userId,
                usedAt: MoreThanOrEqual(timeWindowStart)
            }
        });

        // Kiểm tra có vượt quá số lệnh tối đa không
        if (count >= maxCommands) {
            // Kiểm tra xem có đang trong cooldown không
            const cooldownStart = new Date(Date.now() - cooldownTime);
            const cooldownViolations = await commandUsageRepo.count({
                where: {
                    userId,
                    usedAt: MoreThanOrEqual(cooldownStart)
                }
            });

            // Nếu đã vi phạm trong thời gian cooldown, tiếp tục chặn
            if (cooldownViolations > 0) {
                return true;
            }
        }

        return false;
    } catch (error) {
        global.logger.error(`Lỗi kiểm tra spam: ${error}`);
        return false;
    }
}

/**
 * Xóa lịch sử sử dụng lệnh cũ
 * 
 * @param olderThan Thời gian (milliseconds) để xóa dữ liệu cũ hơn
 * @returns Số lượng bản ghi đã xóa
 */
export async function cleanupOldCommandUsage(olderThan: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
        if (!global.db) return 0;

        const commandUsageRepo = global.db.getRepository(CommandUsage);

        // Tính thời điểm cắt
        const cutoffDate = new Date(Date.now() - olderThan);

        // Xóa các bản ghi cũ
        const result = await commandUsageRepo.delete({
            usedAt: LessThan(cutoffDate)
        });

        global.logger.info(`Đã xóa ${result.affected || 0} bản ghi lịch sử lệnh cũ`);
        return result.affected || 0;
    } catch (error) {
        global.logger.error(`Lỗi xóa lịch sử lệnh cũ: ${error}`);
        return 0;
    }
}