import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { setupPayOSWebhook } from './routes/webhook';
import { setupAPIRoutes } from './routes/api';
import applyAuthMiddleware from './middlewares/auth';
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
        app.use((req: Request, res: Response, next: NextFunction) => {
            // Thêm các header bảo mật
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            next();
        });

        // Thiết lập route chính
        app.get('/', (req: Request, res: Response) => {
            res.status(200).json({ status: 'ok', message: 'ZCA Bot API is running' });
        });

        // Thiết lập route kiểm tra sức khỏe
        app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({ status: 'ok', uptime: process.uptime() });
        });

        // Thiết lập webhook PayOS
        setupPayOSWebhook(app);

        app.use('/api', applyAuthMiddleware);
        setupAPIRoutes(app);

        // Xử lý route không tồn tại
        app.use((req: Request, res: Response) => {
            res.status(404).json({ error: 'Route not found' });
        });

        // Xử lý lỗi
        app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            global.logger.error(`Error in web server: ${err}`);
            res.status(500).json({ error: 'Server error' });
        });

        // Khởi động máy chủ
        return new Promise<void>((resolve, reject) => {
            const portNumber = typeof PORT === 'string' ? parseInt(PORT) : PORT;
            app.listen(portNumber, () => {
                global.logger.info(`Máy chủ web đã khởi động tại cổng ${portNumber}`);
                resolve();
            }).on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    // Thử port khác
                    global.logger.info(`Port ${portNumber} đã được sử dụng, đang thử port ${portNumber + 1}...`);
                    app.listen(portNumber + 1);
                } else {
                    global.logger.error(`Lỗi khởi động máy chủ web: ${err}`);
                    reject(err);
                }
            });
        });

    } catch (error) {
        global.logger.error(`Lỗi thiết lập máy chủ web: ${error}`);
        throw error;
    }
}