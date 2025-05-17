import { Express, Request, Response } from 'express';
import { Router } from 'express';
import crypto from 'crypto';
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
    } catch (error: any) {
      global.logger.error(`Lỗi kiểm tra webhook: ${error}`);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi kiểm tra webhook',
        error: error.message
      });
    }
  });

  /**
   * Endpoint chính xử lý webhook từ PayOS
   * Theo tài liệu: https://payos.vn/docs/du-lieu-tra-ve/webhook/
   */
  //ts@ignore
  //ts@ts-ignore
  // @ts-ignore
  router.post('/payos', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      global.logger.info('===== WEBHOOK PAYOS =====');
      global.logger.info(`Thời gian: ${new Date().toISOString()}`);
      global.logger.info(`IP: ${req.ip}`);
      
      // Log headers và body để debug
      global.logger.debug(`Headers: ${JSON.stringify(req.headers)}`);
      global.logger.debug(`Body: ${JSON.stringify(req.body)}`);
      
      // Kiểm tra dữ liệu webhook
      if (!req.body || Object.keys(req.body).length === 0) {
        global.logger.error('Nhận webhook với body rỗng');
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu webhook trống'
        });
      }
      
      // Xác thực chữ ký webhook theo tài liệu PayOS
      const webhookBody = req.body;
      const webhookSignature = req.headers['x-payos-signature'];
      
      // Kiểm tra có webhook signature không
      if (!webhookSignature) {
        global.logger.error('Không tìm thấy header x-payos-signature');
        return res.status(401).json({
          success: false,
          message: 'Thiếu chữ ký xác thực'
        });
      }
      
      // Xác thực webhook signature
      try {
        const dataString = JSON.stringify(webhookBody);
        const expectedSignature = crypto
          .createHmac('sha256', PAYOS_CONFIG.checksumKey)
          .update(dataString)
          .digest('hex');
          
        if (expectedSignature !== webhookSignature) {
          global.logger.error('Chữ ký webhook không hợp lệ');
          global.logger.debug(`Expected: ${expectedSignature}, Received: ${webhookSignature}`);
          return res.status(401).json({
            success: false,
            message: 'Chữ ký webhook không hợp lệ'
          });
        }
        
        global.logger.info('✅ Xác thực chữ ký webhook thành công');
      } catch (signatureError: any) {
        global.logger.error(`Lỗi xác thực chữ ký: ${signatureError.message}`);
        return res.status(401).json({
          success: false,
          message: 'Lỗi xác thực chữ ký'
        });
      }
      
      // Theo tài liệu PayOS: Trích xuất data từ webhook
      // https://payos.vn/docs/du-lieu-tra-ve/webhook/
      const {
        transactionId, // mã giao dịch từ PayOS
        orderCode, // mã đơn hàng của merchant
        amount, // số tiền
        description, // mô tả
        status, // trạng thái giao dịch: PAID hoặc CANCELLED
        cancellationReason, // lý do hủy (nếu có)
        checkoutUrl, // URL checkout
        transaction, // thông tin chi tiết giao dịch
        paymentLinkId, // ID của payment link
        createdAt, // thời gian tạo payment link
        paymentMethod, // phương thức thanh toán
        customer, // thông tin khách hàng
        merchantId, // ID merchant
        terminal, // thông tin terminal
        bankReference, // mã tham chiếu từ ngân hàng
        accountNumber, // số tài khoản khách hàng
        accountName, // tên tài khoản khách hàng
        cardHolderName, // chủ thẻ
        maskedPan, // số thẻ ẩn danh
        currency, // tiền tệ
        cardType, // loại thẻ
      } = webhookBody;
      
      global.logger.info(`Webhook Data - OrderCode: ${orderCode}, TransactionId: ${transactionId}, Status: ${status}`);
      
      // Chỉ xử lý webhook nếu trạng thái là PAID
      if (status === 'PAID') {
        global.logger.info(`Thanh toán thành công cho đơn hàng: ${orderCode}`);
        
        // Tìm payment record trong database
        const payment = await paymentService().findPaymentByOrderCode(orderCode);
        
        if (!payment) {
          global.logger.error(`Không tìm thấy payment với order code: ${orderCode}`);
          return res.status(200).json({
            success: false,
            message: 'Không tìm thấy thanh toán, nhưng đã nhận webhook'
          });
        }
        
        // Kiểm tra nếu payment đã xử lý rồi
        if (payment.status === 'completed') {
          global.logger.info(`Đơn hàng ${orderCode} đã được xử lý trước đó`);
          return res.status(200).json({
            success: true,
            message: 'Đơn hàng đã được xử lý trước đó'
          });
        }
        
        // Xử lý thanh toán thành công
        global.logger.info(`Bắt đầu xử lý thanh toán: ${payment.id}`);
        const processResult = await processSuccessfulPayment(
          payment.id,
          transactionId
        );
        
        if (processResult) {
          global.logger.info(`Đã xử lý thanh toán thành công: ${payment.id}`);
        } else {
          global.logger.error(`Xử lý thanh toán thất bại mặc dù trạng thái là PAID: ${payment.id}`);
        }
        
        const processingTime = Date.now() - startTime;
        global.logger.info(`Thời gian xử lý webhook: ${processingTime}ms`);
        
        // Trả về thành công
        return res.status(200).json({ 
          success: true,
          message: 'Xử lý thanh toán thành công',
          processing_time: processingTime
        });
      } else if (status === 'CANCELLED') {
        // Xử lý giao dịch bị hủy
        global.logger.info(`Thanh toán bị hủy cho đơn hàng: ${orderCode}`);
        global.logger.info(`Lý do hủy: ${cancellationReason || 'Không có lý do'}`);
        
        // Tìm payment record và cập nhật trạng thái thành failed
        const payment = await paymentService().findPaymentByOrderCode(orderCode);
        
        if (payment) {
          await paymentService().updatePaymentStatus(payment.id, 'failed');
          global.logger.info(`Đã cập nhật trạng thái thanh toán thành failed: ${payment.id}`);
        }
        
        return res.status(200).json({ 
          success: true,
          message: 'Đã ghi nhận giao dịch hủy'
        });
      } else {
        // Trạng thái không xác định
        global.logger.warn(`Nhận webhook với trạng thái không xác định: ${status}`);
        
        return res.status(200).json({ 
          success: true,
          message: `Đã nhận webhook với trạng thái: ${status}`
        });
      }
    } catch (error: any) {
      global.logger.error(`Lỗi xử lý webhook PayOS: ${error.message}`);
      if (error.stack) {
        global.logger.error(`Stack: ${error.stack}`);
      }
      
      // Trả về 200 để PayOS không gửi lại webhook, theo hướng dẫn của PayOS
      return res.status(200).json({
        success: false,
        message: 'Đã nhận webhook nhưng xử lý gặp lỗi',
        error: error.message
      });
    }
  });

  // Endpoint callback URL cho người dùng sau khi thanh toán
  router.get('/payment/callback', (req: Request, res: Response) => {
    try {
      // Log query params cho debug
      global.logger.debug(`Payment callback - Query params: ${JSON.stringify(req.query)}`);
      
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
    } catch (error: any) {
      global.logger.error(`Lỗi xử lý payment callback: ${error.message}`);
      res.status(500).send('Đã xảy ra lỗi khi xử lý thanh toán. Vui lòng liên hệ hỗ trợ.');
    }
  });

  // Endpoint cancel URL khi người dùng hủy thanh toán
  router.get('/payment/cancel', (req: Request, res: Response) => {
    try {
      // Log query params cho debug
      global.logger.debug(`Payment cancel - Query params: ${JSON.stringify(req.query)}`);
      
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
    } catch (error: any) {
      global.logger.error(`Lỗi xử lý payment cancel: ${error.message}`);
      res.status(500).send('Đã xảy ra lỗi. Vui lòng liên hệ hỗ trợ.');
    }
  });

  // Gắn router vào app
  app.use('/webhook', router);
}