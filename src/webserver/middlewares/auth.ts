import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import global from '../../global';

// Khóa API (mặc định tạo ngẫu nhiên khi khởi động, nên lưu ra file để sử dụng lại)
const API_KEY = process.env.API_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Middleware xác thực API
 */
export default function applyAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void | Response<any, Record<string, any>> {
    try {
        // Lấy API key từ header
        const apiKey = req.headers['x-api-key'] as string;

        // Kiểm tra API key
        if (!apiKey || apiKey !== API_KEY) {
            global.logger.warn(`Truy cập API với API key không hợp lệ: ${req.ip}`);
            return res.status(401).json({ error: 'Không có quyền truy cập' });
        }

        // Cho phép truy cập nếu API key hợp lệ
        next();
    } catch (error) {
        global.logger.error(`Lỗi xác thực API: ${error}`);
        return res.status(500).json({ error: 'Lỗi xác thực' });
    }
}

// Hiển thị API key trong log khi khởi động (chỉ trong môi trường dev)
if (process.env.NODE_ENV === 'development') {
    global.logger.debug(`API key: ${API_KEY}`);
}