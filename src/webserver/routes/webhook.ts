import { Express, Request, Response } from 'express';
import { Router } from 'express';
import { processWebhookData, getPaymentStatusDescription } from '../../services/payos';
import { processSuccessfulPayment } from '../../services/subscription';
import { paymentService } from '../../database/services';
import global from '../../global';

/**
 * Sets up PayOS webhook routes
 * @param app Express app instance
 */
export function setupPayOSWebhook(app: Express) {
  const router = Router();

  /**
   * Main PayOS webhook endpoint
   * This receives payment notifications from PayOS
   */
  // @ts-ignore
  router.post('/payos', async (req: Request, res: Response) => {
    try {
      global.logger.info('Received webhook from PayOS');
      global.logger.debug(`Webhook body: ${JSON.stringify(req.body)}`);

      // Verify and process the webhook data
      try {
        // Important: Use the raw body for verification to maintain integrity
        const webhookData = processWebhookData(req.body);
        const orderCode = webhookData.data.orderCode;

        global.logger.info(`PayOS webhook - Order: ${orderCode}, Status: ${webhookData.data.status} (${getPaymentStatusDescription(webhookData.data.status)})`);

        // Check if payment was successful
        if (webhookData.data.status === 1) { // 1 = Success
          global.logger.info(`Received successful payment webhook: ${orderCode}`);

          // Find payment in database using order code
          const payment = await paymentService().findPaymentByOrderCode(orderCode);

          if (!payment) {
            global.logger.error(`Payment not found for order code: ${orderCode}`);
            // Return 200 to acknowledge webhook receipt even if we can't process it
            return res.status(200).json({
              success: false,
              message: 'Payment not found, but webhook received'
            });
          }

          // Process the successful payment
          const processResult = await processSuccessfulPayment(
            payment.id,
            webhookData.data.reference
          );

          if (processResult) {
            global.logger.info(`Successfully processed payment: ${payment.id}`);
          } else {
            global.logger.error(`Failed to process payment despite receiving webhook: ${payment.id}`);
          }
        } else {
          global.logger.info(`Received webhook with status: ${webhookData.data.status} (${getPaymentStatusDescription(webhookData.data.status)})`);
        }

        // Always acknowledge receipt with 200 status code
        // This prevents PayOS from retrying the webhook unnecessarily
        return res.status(200).json({ success: true });
      } catch (verifyError) {
        global.logger.error(`Error verifying webhook data: ${verifyError}`);

        // Still return 200 to prevent PayOS from retrying with the same invalid data
        return res.status(200).json({
          success: false,
          error: 'Invalid webhook data'
        });
      }
    } catch (error) {
      global.logger.error(`Error processing PayOS webhook: ${error}`);

      // Still return 200 to acknowledge receipt
      return res.status(200).json({
        success: false,
        error: 'Server error processing webhook'
      });
    }
  });

  /**
   * Callback URL endpoint for user redirection after successful payment
   */
  router.get('/payment/callback', (req: Request, res: Response) => {
    // Display success page to user
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

  /**
   * Cancel URL endpoint for user redirection after cancelled payment
   */
  router.get('/payment/cancel', (req: Request, res: Response) => {
    // Display cancellation page to user
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

  // Register webhook-related routes
  app.use('/webhook', router);
}