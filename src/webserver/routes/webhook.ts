/**
 * File: src/webserver/routes/webhook.ts
 * Mô tả: Xử lý webhook từ PayOS
 */

import { Express } from 'express';
import { verifyWebhookChecksum } from '../../services/payos';
import { processSuccessfulPayment } from '../../services/subscription';
import { findPaymentByOrderCode } from '../../database/models/payment';
import { PAYOS_CONFIG } from '../../config';
import global from '../../global';

/**
 * Thiết lập route webhook PayOS
 * @param app Express app instance
 */
export function setupPayOSWebhook(app: Express) {
    // Endpoint xử lý webhook từ PayOS
    app.post('/webhook/payos', async (req, res) => {
        try {
            global.logger.info('Nhận webhook từ PayOS');

            // Lấy checksum từ header
            const checksumFromHeader = req.headers['x-checksum'] as string;

            if (!checksumFromHeader) {
                global.logger.error('Không tìm thấy x-checksum trong header');
                return res.status(400).json({ error: 'Thiếu checksum' });
            }

            // Xác thực checksum
            const isValid = verifyWebhookChecksum(req.body, checksumFromHeader);

            if (!isValid) {
                global.logger.error('Checksum không hợp lệ');
                return res.status(400).json({ error: 'Checksum không hợp lệ' });
            }

            // Xử lý dữ liệu webhook
            const webhookData = req.body;

            // Kiểm tra trạng thái thanh toán
            if (webhookData.data && webhookData.data.status === 1) { // 1 = Thành công
                global.logger.info(`Nhận webhook thanh toán thành công: ${webhookData.data.orderCode}`);

                // Tìm payment trong database
                const payment = await findPaymentByOrderCode(webhookData.data.orderCode);

                if (!payment) {
                    global.logger.error(`Không tìm thấy payment với order code: ${webhookData.data.orderCode}`);
                    return res.status(404).json({ error: 'Payment not found' });
                }

                // Xử lý thanh toán thành công
                await processSuccessfulPayment(
                    payment.id,
                    webhookData.data.transactionId || webhookData.data.reference
                );

                global.logger.info(`Đã xử lý thanh toán thành công: ${payment.id}`);
            } else {
                global.logger.info(`Nhận webhook với trạng thái không phải thành công: ${webhookData.data?.status}`);
            }

            // Trả về thành công
            return res.status(200).json({ success: true });
        } catch (error) {
            global.logger.error(`Lỗi xử lý webhook PayOS: ${error}`);
            return res.status(500).json({ error: 'Server error' });
        }
    });

    // Endpoint callback URL cho người dùng sau khi thanh toán
    app.get('/payment/callback', (req, res) => {
        // Hiển thị trang thông báo thanh toán đã nhận
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thanh toán đã được xác nhận</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .success-box { max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
          .success-icon { font-size: 72px; color: #4CAF50; }
          h1 { color: #333; }
          p { color: #666; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="success-box">
          <div class="success-icon">✓</div>
          <h1>Thanh toán đã được xác nhận</h1>
          <p>Cảm ơn bạn đã thanh toán. Hệ thống đang xử lý giao dịch của bạn.</p>
          <p>Vui lòng quay lại ứng dụng Zalo để tiếp tục.</p>
        </div>
      </body>
      </html>
    `);
    });
}