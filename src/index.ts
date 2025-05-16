import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, closeDatabase } from './database';
import { loginWithCookie } from './auth/login';
import { setupEventListeners } from './events/handler';
import { registerCommands } from './commands';
import { setupWebServer } from './webserver';
import { checkExpiredGroups, sendExpirationReminders } from './services/subscription';
import { cleanupOldCommandUsage } from './database/models/commandTracker';
import global from './global';

// Tải biến môi trường trước khi thực hiện bất kỳ hành động nào
dotenv.config();

// Đảm bảo các thư mục cần thiết tồn tại
ensureDirectoriesExist();

/**
 * Khởi tạo và cấu hình bot
 */
async function initializeBot() {
    try {
        // Đăng nhập với cookie
        const api = await loginWithCookie();
        global.logger.info(`Bot đã khởi động thành công với ID: ${api.id}`);
        return api;
    } catch (error) {
        throw new Error(`Khởi tạo bot thất bại: ${error}`);
    }
}

/**
 * Đảm bảo các thư mục cần thiết tồn tại
 */
function ensureDirectoriesExist() {
    const dirs = [
        'logs',
        'backups'
    ];

    for (const dir of dirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            global.logger.info(`Đã tạo thư mục: ${dir}`);
        }
    }
}

/**
 * Thiết lập các tác vụ định kỳ
 */
function setupCronTasks() {
    // Kiểm tra nhóm hết hạn mỗi giờ
    cron.schedule('0 * * * *', async () => {
        global.logger.info('Đang chạy kiểm tra nhóm hết hạn...');
        try {
            await checkExpiredGroups();
        } catch (error) {
            global.logger.error(`Lỗi kiểm tra nhóm hết hạn: ${error}`);
        }
    });

    // Gửi thông báo nhắc nhở gia hạn mỗi ngày lúc 8 giờ sáng
    cron.schedule('0 8 * * *', async () => {
        global.logger.info('Đang gửi thông báo nhắc nhở gia hạn...');
        try {
            await sendExpirationReminders(3); // Nhắc nhở trước 3 ngày
        } catch (error) {
            global.logger.error(`Lỗi gửi thông báo nhắc nhở gia hạn: ${error}`);
        }
    });

    // Dọn dẹp dữ liệu lệnh cũ mỗi 6 giờ
    cron.schedule('0 */6 * * *', async () => {
        global.logger.info('Đang chạy dọn dẹp dữ liệu lệnh cũ...');
        try {
            await cleanupOldCommandUsage(24 * 60 * 60 * 1000); // Xóa dữ liệu cũ hơn 24 giờ
        } catch (error) {
            global.logger.error(`Lỗi dọn dẹp dữ liệu lệnh cũ: ${error}`);
        }
    });

    // Sao lưu cơ sở dữ liệu hàng ngày lúc 0 giờ
    cron.schedule('0 0 * * *', () => {
        global.logger.info('Đang sao lưu cơ sở dữ liệu...');
        try {
            const { exec } = require('child_process');
            exec('node scripts/backup.js', (error: Error | null, _stdout: string, _stderr: string) => {
                if (error) {
                    global.logger.error(`Lỗi sao lưu cơ sở dữ liệu: ${error}`);
                    return;
                }
                global.logger.info('Sao lưu cơ sở dữ liệu thành công');
            });
        } catch (error) {
            global.logger.error(`Lỗi sao lưu cơ sở dữ liệu: ${error}`);
        }
    });

    global.logger.info('Đã thiết lập tác vụ định kỳ');
}

/**
 * Xử lý tắt ứng dụng
 */
function setupShutdownHandler() {
    // Bắt sự kiện khi ứng dụng bị tắt
    process.on('SIGINT', async () => {
        global.logger.info('Đang tắt ứng dụng...');
        try {
            // Đóng kết nối cơ sở dữ liệu nếu đang mở
            await closeDatabase();

            // Các tác vụ dọn dẹp khác nếu cần
            global.logger.info('Đã tắt ứng dụng an toàn');
        } catch (error) {
            global.logger.error(`Lỗi khi tắt ứng dụng: ${error}`);
        }
        process.exit(0);
    });

    // Bắt lỗi không xử lý
    process.on('uncaughtException', (error: Error) => {
        global.logger.error(`Lỗi không xử lý: ${error.stack}`);
    });

    // Bắt promise bị từ chối mà không xử lý
    process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
        global.logger.error(`Promise bị từ chối mà không xử lý: ${reason}`);
    });
}

/**
 * Hàm khởi động ứng dụng
 */
async function startApplication() {
    try {
        const startTime = Date.now();
        global.logger.info('Đang khởi động ứng dụng...');

        // Khởi tạo cơ sở dữ liệu
        global.logger.info('Đang kết nối cơ sở dữ liệu...');
        await initializeDatabase();
        global.logger.info('Kết nối cơ sở dữ liệu thành công');

        // Khởi tạo bot
        global.logger.info('Đang khởi tạo bot...');
        global.bot = await initializeBot();
        global.logger.info(`Bot đã khởi động với ID: ${global.bot.id}`);

        // Đăng ký lệnh
        global.logger.info('Đang đăng ký lệnh...');
        const commandCount = registerCommands();
        global.logger.info(`Đã đăng ký ${commandCount} lệnh`);

        // Thiết lập các trình lắng nghe sự kiện
        global.logger.info('Đang thiết lập trình lắng nghe sự kiện...');
        setupEventListeners();

        // Thiết lập tác vụ định kỳ
        global.logger.info('Đang thiết lập tác vụ định kỳ...');
        setupCronTasks();

        // Thiết lập máy chủ webhook
        global.logger.info('Đang khởi động máy chủ webhook...');
        await setupWebServer();

        // Thiết lập xử lý tắt ứng dụng
        setupShutdownHandler();

        const bootTime = ((Date.now() - startTime) / 1000).toFixed(2);
        global.logger.info(`Ứng dụng đã khởi động thành công trong ${bootTime}s`);

        // Hiển thị logo và thông tin phiên bản
        displayLogo();

    } catch (error) {
        global.logger.error(`Lỗi khởi động ứng dụng: ${error}`);
        process.exit(1);
    }
}

/**
 * Hiển thị logo và thông tin phiên bản
 */
function displayLogo() {
    // Đọc thông tin phiên bản từ package.json
    const packageJson = require('../package.json');

    console.log(`
  ███████╗ ██████╗ █████╗     ██████╗  ██████╗ ████████╗
  ╚══███╔╝██╔════╝██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
    ███╔╝ ██║     ███████║    ██████╔╝██║   ██║   ██║   
   ███╔╝  ██║     ██╔══██║    ██╔══██╗██║   ██║   ██║   
  ███████╗╚██████╗██║  ██║    ██████╔╝╚██████╔╝   ██║   
  ╚══════╝ ╚═════╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝   
  
  ZCA Bot v${packageJson.version} - Bot Zalo toàn diện
  Node.js: ${process.version}
  Thời gian: ${new Date().toLocaleString('vi-VN')}
  `);
}

// Khởi động ứng dụng
startApplication();