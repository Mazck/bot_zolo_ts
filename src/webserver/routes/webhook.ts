import { Express, Request, Response } from 'express';
import { Router } from 'express';
import { processWebhookData, getPaymentStatusDescription } from '../../services/payos';
import { processSuccessfulPayment } from '../../services/subscription';
import { paymentService } from '../../database/services';
import { PAYOS_CONFIG } from '../../config';
import global from '../../global';

/**
 * Thiết lập route webhook PayOS
 * @param app Express app instance
 */
export function setupPayOSWebhook(app: Express) {
  const router = Router();

  // Endpoint để kiểm tra webhook
  router.get('/payos/check', (req: Request, res: Response) => {
    try {
      // Kiểm tra cấu hình
      const { clientId, apiKey, checksumKey, webhookUrl } = PAYOS_CONFIG;

      // Trả về thông tin cấu hình (không bao gồm giá trị thực tế của các key)
      res.status(200).json({
        status: 'ok',
        message: 'Webhook route hoạt động',
        config: {
          hasClientId: !!clientId,
          hasApiKey: !!apiKey,
          hasChecksumKey: !!checksumKey,
          webhookUrl: webhookUrl || 'Chưa cấu hình'
        }
      });
    } catch (error:any) {
      global.logger.error(`Lỗi kiểm tra webhook: ${error}`);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi kiểm tra webhook',
        error: error.message
      });
    }
  });

  // Endpoint xử lý webhook từ PayOS
  //ts-ignore
  // @ts-ignore
  router.post('/payos', async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      global.logger.info('===== WEBHOOK PAYOS =====');
      global.logger.info(`Thời gian: ${new Date().toISOString()}`);
      global.logger.info(`IP: ${req.ip}`);
      global.logger.info(`Headers: ${JSON.stringify(req.headers)}`);

      // Kiểm tra dữ liệu webhook
      if (!req.body || Object.keys(req.body).length === 0) {
        global.logger.error('Nhận webhook với body rỗng');
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu webhook trống'
        });
      }

      global.logger.info(`Body: ${JSON.stringify(req.body)}`);

      // Xác minh và xử lý dữ liệu webhook
      try {
        // Truy xuất và xác minh dữ liệu webhook
        const webhookData = processWebhookData(req.body);

        global.logger.info(`Webhook đã xác minh: orderId=${webhookData.data.orderCode}, trạng thái=${webhookData.data.status}`);

        // Kiểm tra trạng thái thanh toán
        if (webhookData.data.status === 1) { // 1 = Thành công
          global.logger.info(`Xử lý thanh toán thành công cho đơn hàng: ${webhookData.data.orderCode}`);

          // Tìm payment trong database
          const payment = await paymentService().findPaymentByOrderCode(webhookData.data.orderCode);

          if (!payment) {
            global.logger.error(`Không tìm thấy payment với order code: ${webhookData.data.orderCode}`);
            return res.status(200).json({
              success: false,
              message: 'Không tìm thấy thanh toán, nhưng đã nhận webhook'
            });
          }

          // Kiểm tra nếu payment đã xử lý rồi
          if (payment.status === 'completed') {
            global.logger.info(`Đơn hàng ${webhookData.data.orderCode} đã được xử lý trước đó`);
            return res.status(200).json({
              success: true,
              message: 'Đơn hàng đã được xử lý trước đó'
            });
          }

          // Xử lý thanh toán thành công
          const processResult = await processSuccessfulPayment(
            payment.id,
            webhookData.data.reference
          );

          if (processResult) {
            global.logger.info(`Đã xử lý thanh toán thành công: ${payment.id}`);
          } else {
            global.logger.error(`Xử lý thanh toán thất bại mặc dù đã nhận webhook: ${payment.id}`);
          }

          const processingTime = Date.now() - startTime;
          global.logger.info(`Thời gian xử lý webhook: ${processingTime}ms`);

          // Trả về thành công
          return res.status(200).json({
            success: true,
            message: 'Xử lý thanh toán thành công',
            processing_time: processingTime
          });
        } else {
          global.logger.info(`Nhận webhook với trạng thái: ${webhookData.data.status} (${getPaymentStatusDescription(webhookData.data.status)})`);

          // Trả về thành công - PayOS cần phản hồi 200 ngay cả khi chưa xử lý
          return res.status(200).json({
            success: true,
            message: `Đã nhận webhook với trạng thái: ${getPaymentStatusDescription(webhookData.data.status)}`
          });
        }
      } catch (verifyError) {
        global.logger.error(`Lỗi xác minh dữ liệu webhook: ${verifyError}`);
        // Vẫn trả về 200 để PayOS không gửi lại webhook
        return res.status(200).json({
          success: false,
          error: 'Dữ liệu webhook không hợp lệ'
        });
      }
    } catch (error) {
      global.logger.error(`Lỗi xử lý webhook PayOS: ${error}`);
      // Vẫn trả về 200 để PayOS không gửi lại webhook
      return res.status(200).json({
        success: false,
        error: 'Lỗi máy chủ khi xử lý webhook'
      });
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