// src/utils/webhookTester.ts - Phiên bản cải tiến
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Tải biến môi trường vì file này có thể được chạy trực tiếp
dotenv.config();

/**
 * Tạo webhook payload mô phỏng theo định dạng mới của PayOS
 */
export async function createTestWebhook() {
    try {
        // Đọc cấu hình từ môi trường
        const clientId = process.env.PAYOS_CLIENT_ID;
        const apiKey = process.env.PAYOS_API_KEY;
        const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
        let webhookUrl = process.env.WEBHOOK_URL;

        // Kiểm tra cấu hình
        if (!clientId || !apiKey || !checksumKey) {
            console.error('ERROR: Thiếu cấu hình PayOS trong file .env!');
            console.error('Vui lòng kiểm tra các biến: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY');
            return;
        }

        if (!webhookUrl) {
            console.error('ERROR: Thiếu URL webhook trong file .env!');
            console.error('Vui lòng kiểm tra biến WEBHOOK_URL');
            return;
        }

        // Đảm bảo URL webhook kết thúc với /webhook/payos
        if (!webhookUrl.endsWith('/webhook/payos')) {
            if (!webhookUrl.endsWith('/')) {
                webhookUrl += '/';
            }
            webhookUrl += 'webhook/payos';
        }

        console.log('===== THÔNG TIN WEBHOOK =====');
        console.log(`URL Webhook: ${webhookUrl}`);

        // Tạo mã đơn hàng ngẫu nhiên
        const orderCode = `TEST${Date.now()}`;
        const amount = 99000;
        const timestamp = new Date().toISOString();
        const transactionId = `TR${Date.now()}`;

        // Tạo payload mô phỏng webhook từ PayOS theo định dạng mới
        const payload = {
            transactionId: transactionId,
            orderCode: orderCode,
            amount: amount,
            description: `Test payment for order ${orderCode}`,
            status: 'PAID', // PAID hoặc CANCELLED
            cancellationReason: null,
            checkoutUrl: `https://api-merchant.payos.vn/mobile/payurl-callback/${Date.now()}`,
            paymentLinkId: `PL${Date.now()}`,
            createdAt: timestamp,
            paymentMethod: "ZALOPAY",
            customer: {
                name: "Test User",
                email: "test@example.com",
                phone: "0987654321"
            },
            merchantId: clientId,
            terminal: {
                id: "TERMINAL01",
                name: "Test Terminal"
            },
            bankReference: `BNK${Date.now()}`,
            accountNumber: "9876543210",
            accountName: "TEST USER",
            cardHolderName: "TEST USER",
            maskedPan: "498410******1234",
            currency: "VND",
            cardType: "ATM"
        };

        console.log('===== PAYLOAD =====');
        console.log(JSON.stringify(payload, null, 2));

        // Tạo chữ ký (mô phỏng phương thức ký của PayOS)
        const dataToSign = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', checksumKey)
            .update(dataToSign)
            .digest('hex');

        console.log('===== SIGNATURE =====');
        console.log(signature);

        console.log('\n===== GỬI WEBHOOK TEST =====');
        console.log(`Đang gửi yêu cầu đến ${webhookUrl}...`);

        // Sử dụng axios với timeout và thông tin chi tiết về lỗi
        const response = await axios.post(webhookUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-payos-signature': signature
            },
            timeout: 10000, // 10 giây timeout
            validateStatus: null // Cho phép lấy response với bất kỳ status code nào
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('===== RESPONSE =====');
        console.log(JSON.stringify(response.data, null, 2));

        // Ghi log kết quả để tham khảo sau
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logFile = path.join(logDir, `webhook-test-${Date.now()}.json`);
        const logData = {
            timestamp: new Date().toISOString(),
            webhookUrl,
            payload,
            signature,
            response: {
                status: response.status,
                statusText: response.statusText,
                data: response.data
            }
        };

        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
        console.log(`\nĐã lưu log test vào: ${logFile}`);

        return response.data;
    } catch (error: any) {
        console.error('===== LỖI =====');
        if (error.code === 'ECONNREFUSED') {
            console.error(`Không thể kết nối đến webhook URL. URL không khả dụng hoặc bị chặn bởi tường lửa.`);
        } else if (error.code === 'ENOTFOUND') {
            console.error(`Không tìm thấy host. Kiểm tra URL webhook có chính xác không.`);
        } else if (error.code === 'ETIMEDOUT') {
            console.error(`Yêu cầu hết thời gian chờ. Server không phản hồi.`);
        } else {
            console.error(`Lỗi: ${error.message}`);
        }

        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Response data:`, error.response.data);
        }

        console.error(error.stack);
        return null;
    }
}