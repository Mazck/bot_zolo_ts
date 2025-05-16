import { setupMessageListener } from './messageHandler';
import { setupGroupEventListener } from './groupHandler';
import { setupReactionListener } from './reactionHandler';
import { cleanupOldCommandUsage } from '../database/models/commandTracker';
import global from '../global';

/**
 * Thiết lập tất cả các trình lắng nghe sự kiện
 */
export function setupEventListeners() {
    if (!global.bot) {
        global.logger.error('Bot chưa được khởi tạo, không thể thiết lập event listeners');
        return;
    }

    try {
        // Bắt đầu lắng nghe sự kiện
        global.bot.listener.start();
        global.logger.info('Đã khởi động trình lắng nghe sự kiện Zalo');

        // Thiết lập các trình lắng nghe cụ thể
        setupMessageListener();
        setupGroupEventListener();
        setupReactionListener();

        // Thiết lập tác vụ dọn dẹp dữ liệu command tracker
        setupCleanupTask();

        global.logger.info('Đã thiết lập tất cả các trình lắng nghe sự kiện');
    } catch (error) {
        global.logger.error(`Lỗi thiết lập trình lắng nghe sự kiện: ${error}`);
    }
}

/**
 * Thiết lập tác vụ dọn dẹp dữ liệu cũ
 */
function setupCleanupTask() {
    // Dọn dẹp mỗi 6 giờ
    setInterval(async () => {
        try {
            // Xóa lịch sử lệnh cũ hơn 24 giờ
            await cleanupOldCommandUsage(24 * 60 * 60 * 1000);
        } catch (error) {
            global.logger.error(`Lỗi dọn dẹp dữ liệu cũ: ${error}`);
        }
    }, 6 * 60 * 60 * 1000);

    global.logger.info('Đã thiết lập tác vụ dọn dẹp dữ liệu');
}