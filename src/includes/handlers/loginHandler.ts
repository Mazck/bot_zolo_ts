/**
 * Xử lý đăng nhập vào Zalo
 */
import fs from 'fs';
import path from 'path';
import { Zalo } from 'zca-js';

// Tạo logger đơn giản
const logger = {
    info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
};

export class ZaloLoginHandler {
    private api: Zalo | null = null;

    /**
     * Đăng nhập vào Zalo bằng cookie đã lưu
     * @returns Promise với instance API đã đăng nhập
     */
    async login(): Promise<any> {
        try {
            // Khởi tạo API
            this.api = new Zalo({
                selfListen: false,
                checkUpdate: true,
                logging: false
            });

                try {
                    const cookie = JSON.parse(fs.readFileSync("./cookie.json", 'utf8'));

                    const api = await this.api.login({
                        cookie: cookie,
                        imei: "d7cf9d66-3cd9-466f-ac3d-70f5917cac27-3fa31b52dd6ebc517e5492d43d77e61c",
                        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
                    });

                    api.listener.start();
                    return api;
                } catch (error) {
                    logger.error('Không thể đăng nhập với thông tin đã lưu:', error);
                    throw new Error('Cookie đã hết hạn hoặc không hợp lệ. Vui lòng cung cấp thông tin đăng nhập mới.');
                }
        } catch (error) {
            logger.error('Lỗi khi đăng nhập:', error);
            throw new Error(`Không thể đăng nhập: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

}