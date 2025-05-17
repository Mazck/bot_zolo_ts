import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import { initializeDatabase, isDatabaseConnected } from '../database';
import global from '../global';
import { createLogger } from '../utils/logger';

// Tải biến môi trường
dotenv.config();

// Khởi tạo logger nếu cần
if (!global.logger) {
    global.logger = createLogger();
}

async function checkSystem() {
    console.log('===== KIỂM TRA HỆ THỐNG =====');

    // 1. Kiểm tra file .env
    console.log('\n1. Kiểm tra file .env:');
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ Không tìm thấy file .env!');
    } else {
        console.log('✅ File .env tồn tại');

        // Kiểm tra các biến môi trường quan trọng
        const requiredVars = [
            'PAYOS_CLIENT_ID',
            'PAYOS_API_KEY',
            'PAYOS_CHECKSUM_KEY',
            'WEBHOOK_URL'
        ];

        let missingVars = 0;
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                console.error(`❌ Thiếu biến môi trường quan trọng: ${varName}`);
                missingVars++;
            }
        }

        if (missingVars === 0) {
            console.log('✅ Tất cả biến môi trường quan trọng đã được cấu hình');
        }
    }

    // 2. Kiểm tra kết nối cơ sở dữ liệu
    console.log('\n2. Kiểm tra kết nối cơ sở dữ liệu:');
    try {
        if (!global.db || !global.db.isInitialized) {
            console.log('Đang kết nối đến cơ sở dữ liệu...');
            await initializeDatabase();
        }

        const connected = await isDatabaseConnected();
        if (connected) {
            console.log('✅ Kết nối cơ sở dữ liệu thành công');
        } else {
            console.error('❌ Không thể kết nối đến cơ sở dữ liệu');
        }
    } catch (error:any) {
        console.error(`❌ Lỗi kết nối cơ sở dữ liệu: ${error.message}`);
    }

    // 3. Kiểm tra webhook URL
    console.log('\n3. Kiểm tra webhook URL:');
    const webhookUrl = process.env.WEBHOOK_URL;

    if (!webhookUrl) {
        console.error('❌ Không tìm thấy URL webhook trong file .env!');
    } else {
        console.log(`URL webhook: ${webhookUrl}`);

        // Kiểm tra URL hợp lệ
        try {
            const url = new URL(webhookUrl);
            console.log(`✅ URL hợp lệ: ${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`);

            // Kiểm tra HTTPS
            if (url.protocol !== 'https:') {
                console.warn('⚠️ PayOS yêu cầu webhook sử dụng HTTPS. URL hiện tại sử dụng ' + url.protocol);
            }

            // Kiểm tra kết nối
            try {
                const checkUrl = `${webhookUrl.endsWith('/') ? webhookUrl.slice(0, -1) : webhookUrl}/webhook/payos/check`;
                console.log(`Kiểm tra kết nối đến: ${checkUrl}`);

                const response = await axios.get(checkUrl, {
                    timeout: 5000,
                    validateStatus: null
                });

                console.log(`Status: ${response.status} ${response.statusText}`);
                if (response.status >= 200 && response.status < 300) {
                    console.log('✅ Webhook URL hoạt động');
                    console.log('Response:', response.data);
                } else {
                    console.error(`❌ Webhook URL trả về status code: ${response.status}`);
                }
            } catch (error: any) {
                console.error(`❌ Không thể kết nối đến webhook URL: ${error.message}`);
                if (error.code) {
                    console.error(`Mã lỗi: ${error.code}`);
                }
            }
        } catch (urlError: any) {
            console.error(`❌ URL webhook không hợp lệ: ${urlError.message}`);
        }
    }

    // 4. Kiểm tra cấu hình PayOS
    console.log('\n4. Kiểm tra cấu hình PayOS:');
    const payosClientId = process.env.PAYOS_CLIENT_ID;
    const payosApiKey = process.env.PAYOS_API_KEY;
    const payosChecksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!payosClientId || !payosApiKey || !payosChecksumKey) {
        console.error('❌ Thiếu thông tin cấu hình PayOS!');
    } else {
        console.log('✅ Đã cấu hình thông tin PayOS');

        // Kiểm tra độ dài key hợp lệ
        if (payosClientId.length < 10) console.warn('⚠️ PAYOS_CLIENT_ID có vẻ quá ngắn');
        if (payosApiKey.length < 20) console.warn('⚠️ PAYOS_API_KEY có vẻ quá ngắn');
        if (payosChecksumKey.length < 20) console.warn('⚠️ PAYOS_CHECKSUM_KEY có vẻ quá ngắn');
    }

    console.log('\n===== KẾT THÚC KIỂM TRA =====');
}

// Chạy kiểm tra khi gọi trực tiếp
if (require.main === module) {
    checkSystem()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Lỗi:', err);
            process.exit(1);
        });
}

export { checkSystem };