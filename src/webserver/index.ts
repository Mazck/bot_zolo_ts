/**
 * File: src/webserver/index.ts
 * Mô tả: Thiết lập máy chủ web để xử lý webhook và API nội bộ
 */

import express from 'express';
import bodyParser from 'body-parser';
import { setupPayOSWebhook } from './routes/webhook';
import { setupAPIRoutes } from './routes/api';
import { applyAuthMiddleware } from './middlewares/auth';
import global from '../global';

// Cổng máy chủ
const PORT = process.env.PORT || 3000;

/**
 * Thiết lập và khởi động máy chủ web
 */
export async function setupWebServer() {
    try {
        const app = express();

        // Middleware cơ bản
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        // Middleware bảo mật cơ bản
        app.use((req, res, next) => {
            // Thêm các header bảo mật
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });

        // Thiết lập route chính
        app.get('/', (req, res) => {
            res.status(200).json({ status: 'ok', message: 'ZCA Bot API is running' });
        });

        // Thiết lập route kiểm tra sức khỏe
        app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok', uptime: process.uptime() });
        });

        // Thiết lập webhook PayOS
        setupPayOSWebhook(app);

        // Thiết lập API nội bộ (với middleware xác thực)
        app.use('/api', applyAuthMiddleware);
        setupAPIRoutes(app);

        // Xử lý route không tồn tại
        app.use((req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });

        // Xử lý lỗi
        app.use((err, req, res, next) => {
            global.logger.error(`Error in web server: ${err}`);
            res.status(500).json({ error: 'Server error' });
        });

        // Khởi động máy chủ
        return new Promise<void>((resolve, reject) => {
            app.listen(PORT, () => {
                global.logger.info(`Máy chủ web đã khởi động tại cổng ${PORT}`);
                resolve();
            }).on('error', (err) => {
                global.logger.error(`Lỗi khởi động máy chủ web: ${err}`);
                reject(err);
            });
        });

    } catch (error) {
        global.logger.error(`Lỗi thiết lập máy chủ web: ${error}`);
        throw error;
    }
}