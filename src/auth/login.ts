/**
 * File: src/auth/login.ts
 * Mô tả: Xử lý đăng nhập Zalo
 */

import { Zalo } from 'zca-js';
import fs from 'fs';
import path from 'path';
import global from '../global';
import { BOT_CONFIG } from '../config';

/**
 * Đăng nhập vào Zalo bằng cookie
 * @returns API Zalo đã xác thực
 */
export async function loginWithCookie() {
    try {
        // Khởi tạo đối tượng Zalo với các tùy chọn
        const zalo = new Zalo({
            selfListen: false, // không lắng nghe sự kiện của bản thân
            checkUpdate: true, // kiểm tra cập nhật
            logging: true      // bật log của thư viện
        });

        // Kiểm tra cookie từ file hoặc biến môi trường
        let cookie;
        const cookiePath = path.join(process.cwd(), 'cookie.json');

        if (fs.existsSync(cookiePath)) {
            // Đọc cookie từ file
            cookie = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'));
            global.logger.info('Đọc cookie từ file');
        } else if (BOT_CONFIG.cookie) {
            // Đọc cookie từ biến môi trường
            try {
                cookie = JSON.parse(BOT_CONFIG.cookie);
                global.logger.info('Đọc cookie từ biến môi trường');
            } catch (error) {
                global.logger.error('Cookie không đúng định dạng JSON:', error);
                throw new Error('Cookie không đúng định dạng JSON');
            }
        } else {
            throw new Error('Không tìm thấy cookie. Vui lòng cung cấp cookie trong file cookie.json hoặc biến môi trường BOT_COOKIE');
        }

        // Đăng nhập với cookie
        global.logger.info('Đang đăng nhập bằng cookie...');

        const api = await zalo.login({
            cookie: cookie,
            imei: BOT_CONFIG.imei || '00000000-0000-0000-0000-000000000000',
            userAgent: BOT_CONFIG.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });

        global.logger.info('Đăng nhập thành công!');
        return api;
    } catch (error) {
        global.logger.error('Lỗi đăng nhập:', error);
        throw error;
    }
}