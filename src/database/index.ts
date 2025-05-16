import { createConnection, Connection, ConnectionOptions } from 'typeorm';
import { DB_CONFIG } from '../config';
import { UserEntity } from './models/user';
import { GroupEntity } from './models/group';
import { PaymentEntity } from './models/payment';
import { CommandUsage } from './models/commandTracker';
import global from '../global';

/**
 * Khởi tạo kết nối cơ sở dữ liệu
 * @returns Promise với kết nối cơ sở dữ liệu
 */
export async function initializeDatabase(): Promise<Connection> {
    try {
        // Xác định loại cơ sở dữ liệu
        const connectionOptions: ConnectionOptions = {
            ...DB_CONFIG,
            type: DB_CONFIG.type as 'sqlite' | 'mysql',
            entities: [
                UserEntity,
                GroupEntity,
                PaymentEntity,
                CommandUsage
            ],
            // Tùy chọn thêm
            synchronize: true, // Đồng bộ hóa schema (chỉ dùng trong phát triển)
            logging: DB_CONFIG.logging // Ghi log truy vấn SQL
        };

        // Tạo kết nối
        const connection = await createConnection(connectionOptions);
        global.logger.info(`Đã kết nối thành công đến cơ sở dữ liệu ${DB_CONFIG.type}`);

        // Lưu kết nối vào biến toàn cục
        global.db = connection;

        return connection;
    } catch (error) {
        global.logger.error(`Lỗi kết nối cơ sở dữ liệu: ${error}`);
        throw error;
    }
}

/**
 * Đóng kết nối cơ sở dữ liệu
 * @returns Promise khi đã đóng kết nối
 */
export async function closeDatabase(): Promise<void> {
    if (global.db && global.db.isConnected) {
        await global.db.close();
        global.logger.info('Đã đóng kết nối cơ sở dữ liệu');
    }
}

/**
 * Kiểm tra kết nối cơ sở dữ liệu
 * @returns true nếu kết nối OK, false nếu không
 */
export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        if (!global.db || !global.db.isConnected) {
            return false;
        }

        // Thử một truy vấn đơn giản
        await global.db.query('SELECT 1');
        return true;
    } catch (error) {
        global.logger.error(`Lỗi kiểm tra kết nối cơ sở dữ liệu: ${error}`);
        return false;
    }
}