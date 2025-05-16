import { Zalo } from 'zca-js';
import fs from 'fs';
import path from 'path';
import global from '../global';
import { BOT_CONFIG } from '../config';
import { ZaloAPI } from '../global'; // Import the interface from global

/**
 * Đăng nhập vào Zalo bằng cookie
 * @returns API Zalo đã xác thực
 */
export async function loginWithCookie(): Promise<ZaloAPI> {
    try {
        // Khởi tạo đối tượng Zalo với các tùy chọn
        const zalo = new Zalo({
            selfListen: false, // không lắng nghe sự kiện của bản thân
            checkUpdate: true, // kiểm tra cập nhật
            logging: false      // bật log của thư viện
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

        // Đăng nhập với cookie - remove unsupported properties
        global.logger.info('Đang đăng nhập bằng cookie...');

        const loginOptions = {
            cookie: cookie,
            imei: BOT_CONFIG.imei || '00000000-0000-0000-0000-000000000000',
            userAgent: BOT_CONFIG.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            // Remove saveCredentials and credentialsPath
        };

        const api = await zalo.login(loginOptions);

        // Convert to our ZaloAPI interface using unknown as an intermediate step
        const apiWithId = api as unknown as ZaloAPI;

        const data = await apiWithId.getUserInfo(apiWithId.getOwnId())
        const userId = Object.keys(data.changed_profiles)[0];
        global.logger.info(`Đăng nhập thành công vào tài khoản ${data.changed_profiles[userId].zaloName}`);

        // Manually add the missing id property if not present
        if (!apiWithId.id && (api as any).id) {
            apiWithId.id = (api as any).id;
        } else if (!apiWithId.id) {
            // If id is not available at all, generate a placeholder
            apiWithId.id = `zalo-api-${Date.now()}`;
        }

        return apiWithId;
    } catch (error) {
        global.logger.error('Lỗi đăng nhập:', error);
        throw error;
    }
}