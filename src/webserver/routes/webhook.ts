import { Express, Request, Response } from 'express';
import { Router } from 'express';
import { processWebhookData, getPaymentStatusDescription } from '../../services/payos';
import { processSuccessfulPayment } from '../../services/subscription';
import { findPaymentByOrderCode } from '../../database/models/payment';
import { PAYOS_CONFIG } from '../../config';
import global from '../../global';

/**
 * Thiết lập route webhook PayOS
 * @param app Express app instance
 */
export function setupPayOSWebhook(app: Express) {
  const router = Router();

  // Endpoint xử lý webhook từ PayOS
  // @ts-ignore
  router.post('/payos', async (req: Request, res: Response) => {
    try {
      global.logger.info('Nhận webhook từ PayOS');

      // Xử lý dữ liệu webhook sử dụng thư viện @payos/node
      try {
        // Truy xuất dữ liệu webhook đã xác minh
        const webhookData = processWebhookData(req.body);

        global.logger.info(`Received PayOS webhook - Order: ${webhookData.data.orderCode}, Status: ${webhookData.data.status} (${getPaymentStatusDescription(webhookData.data.status)})`);

        // Kiểm tra trạng thái thanh toán
        if (webhookData.data.status === 1) { // 1 = Thành công
          global.logger.info(`Nhận webhook thanh toán thành công: ${webhookData.data.orderCode}`);

          // Tìm payment trong database
          const payment = await findPaymentByOrderCode(webhookData.data.orderCode);

          if (!payment) {
            global.logger.error(`Không tìm thấy payment với order code: ${webhookData.data.orderCode}`);
            return res.status(404).json({ error: 'Không tìm thấy thanh toán' });
          }

          // Xử lý thanh toán thành công
          await processSuccessfulPayment(
            payment.id,
            webhookData.data.reference
          );

          global.logger.info(`Đã xử lý thanh toán thành công: ${payment.id}`);
        } else {
          global.logger.info(`Nhận webhook với trạng thái: ${webhookData.data.status} (${getPaymentStatusDescription(webhookData.data.status)})`);
        }

        // Trả về thành công - PayOS cần phản hồi 200
        return res.status(200).json({ success: true });
      } catch (verifyError) {
        global.logger.error(`Lỗi xác minh dữ liệu webhook: ${verifyError}`);
        return res.status(400).json({ error: 'Dữ liệu webhook không hợp lệ' });
      }
    } catch (error) {
      global.logger.error(`Lỗi xử lý webhook PayOS: ${error}`);
      return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // Endpoint callback URL cho người dùng sau khi thanh toán thành công
  router.get('/payment/callback', (req: Request, res: Response) => {
    // Hiển thị trang thông báo thanh toán đã nhận
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thanh toán đã được xác nhận</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f0f2f5; }
          .success-box { max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 10px; background-color: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          .success-icon { font-size: 72px; color: #4CAF50; margin-bottom: 20px; }
          h1 { color: #333; margin-bottom: 15px; }
          p { color: #666; line-height: 1.6; margin-bottom: 25px; }
          .back-button { display: inline-block; background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .back-button:hover { background-color: #3367d6; }
        </style>
      </head>
      <body>
        <div class="success-box">
          <div class="success-icon">✓</div>
          <h1>Thanh toán đã được xác nhận</h1>
          <p>Cảm ơn bạn đã thanh toán. Hệ thống đang xử lý giao dịch của bạn.</p>
          <p>Vui lòng quay lại ứng dụng Zalo để tiếp tục.</p>
          <a href="https://zalo.me" class="back-button">Quay lại Zalo</a>
        </div>
      </body>
      </html>
    `);
  });

  // Endpoint cancel URL khi người dùng hủy thanh toán
  router.get('/payment/cancel', (req: Request, res: Response) => {
    // Hiển thị trang thông báo đã hủy thanh toán
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thanh toán đã bị hủy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f0f2f5; }
          .cancel-box { max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 10px; background-color: white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          .cancel-icon { font-size: 72px; color: #f44336; margin-bottom: 20px; }
          h1 { color: #333; margin-bottom: 15px; }
          p { color: #666; line-height: 1.6; margin-bottom: 25px; }
          .back-button { display: inline-block; background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
          .back-button:hover { background-color: #3367d6; }
        </style>
      </head>
      <body>
        <div class="cancel-box">
          <div class="cancel-icon">✗</div>
          <h1>Thanh toán đã bị hủy</h1>
          <p>Bạn đã hủy quá trình thanh toán. Không có khoản phí nào được tính.</p>
          <p>Bạn có thể thử lại sau hoặc chọn phương thức thanh toán khác.</p>
          <a href="https://zalo.me" class="back-button">Quay lại Zalo</a>
        </div>
      </body>
      </html>
    `);
  });

  // Gắn router vào app
  app.use('/webhook', router);
}