import { createConnection } from 'typeorm';
import { DB_CONFIG } from '../../config';
import { UserEntity } from '../models/user';
import { GroupEntity } from '../models/group';
import { PaymentEntity } from '../models/payment';
import { CommandUsage } from '../models/commandTracker';
import global from '../../global';
import { createLogger } from '../../utils/logger';

// Khởi tạo logger
global.logger = createLogger();

/**
 * Chạy migration cơ sở dữ liệu
 */
async function runMigrations(): Promise<void> {
    try {
        // Xác định loại cơ sở dữ liệu
        const connectionOptions = {
            ...DB_CONFIG,
            type: DB_CONFIG.type as 'sqlite' | 'mysql',
            entities: [UserEntity, GroupEntity, PaymentEntity, CommandUsage],
            synchronize: true, // Chỉ dùng trong phát triển, không dùng trong sản xuất
        };

        // Tạo kết nối
        const connection = await createConnection(connectionOptions);
        global.logger.info('Kết nối cơ sở dữ liệu thành công');

        // Chạy migration tự động
        global.logger.info('Đang chạy migration tự động...');

        // TypeORM sẽ tự động đồng bộ schema khi synchronize=true
        global.logger.info('Migration hoàn tất');

        // Đóng kết nối
        await connection.close();
        global.logger.info('Đóng kết nối thành công');

        process.exit(0);
    } catch (error) {
        global.logger.error(`Lỗi migration cơ sở dữ liệu: ${error}`);
        process.exit(1);
    }
}

// Chạy migration
runMigrations();