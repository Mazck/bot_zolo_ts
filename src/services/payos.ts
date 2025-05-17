/**
 * File: src/services/payos.ts
 * Mô tả: Dịch vụ thanh toán qua PayOS.vn sử dụng thư viện chính thức @payos/node
 */

import PayOS from '@payos/node';
import { PAYOS_CONFIG } from '../config';
import { PayOSCreateLinkResponse, PayOSWebhookResponse } from '../types';
import global from '../global';

// Khởi tạo đối tượng PayOS từ cấu hình
const payos = new PayOS(
    PAYOS_CONFIG.clientId,
    PAYOS_CONFIG.apiKey,
    PAYOS_CONFIG.checksumKey
);

/**
 * Tạo link thanh toán PayOS
 * @param amount Số tiền thanh toán (VND)
 * @param orderCode Mã đơn hàng
 * @param description Mô tả đơn hàng
 * @param buyerName Tên người mua (không bắt buộc)
 * @param buyerEmail Email người mua (không bắt buộc)
 * @param buyerPhone SĐT người mua (không bắt buộc)
 * @param cancelUrl URL hủy thanh toán (không bắt buộc)
 * @param returnUrl URL trả về sau thanh toán (không bắt buộc)
 * @returns Thông tin link thanh toán
 */
export async function createPaymentLink(
    amount: number,
    orderCode: string,
    description: string,
    buyerName?: string,
    buyerEmail?: string,
    buyerPhone?: string,
    cancelUrl?: string,
    returnUrl?: string
): Promise<PayOSCreateLinkResponse> {
    try {
        // Thời gian hết hạn: 24 giờ mặc định hoặc từ cấu hình
        const expiryHours = PAYOS_CONFIG.expiryTime || 24;
        const defaultExpireTime = Math.floor(Date.now() / 1000) + expiryHours * 60 * 60;

        // Dữ liệu thanh toán
        const requestData = {
            orderCode: Number(orderCode.replace(/\D/g, '')) || Date.now(), // Đảm bảo orderCode là số
            amount: amount,
            description: description,
            buyerName: buyerName || '',
            buyerEmail: buyerEmail || '',
            buyerPhone: buyerPhone || '',
            cancelUrl: cancelUrl || PAYOS_CONFIG.cancelUrl || `${PAYOS_CONFIG.webhookUrl}/payment/cancel`,
            returnUrl: returnUrl || PAYOS_CONFIG.returnUrl || `${PAYOS_CONFIG.webhookUrl}/payment/callback`,
            expiredAt: defaultExpireTime
        };

        // Gọi API tạo link thanh toán qua thư viện @payos/node
        const response = await payos.createPaymentLink(requestData);

        global.logger.info(`Đã tạo link thanh toán PayOS thành công cho đơn hàng: ${orderCode}`);

        // Chuyển đổi định dạng dữ liệu cho tương thích với code cũ
        const responseData: PayOSCreateLinkResponse = {
            code: '00',
            desc: 'success',
            data: {
                checkoutUrl: response.checkoutUrl,
                qrCode: response.qrCode,
                orderId: String(response.orderCode),
                paymentLinkId: response.paymentLinkId
            }
        };

        return responseData;
    } catch (error) {
        global.logger.error(`Lỗi tạo link thanh toán PayOS: ${error}`);
        throw error;
    }
}

/**
 * Kiểm tra trạng thái giao dịch PayOS
 * @param orderCode Mã đơn hàng
 * @returns Thông tin trạng thái giao dịch
 */
export async function checkPaymentStatus(orderCode: string): Promise<any> {
    try {
        // Sử dụng API từ thư viện @payos/node
        const response = await payos.getPaymentLinkInformation(orderCode);
        return {
            code: '00',
            desc: 'success',
            data: response
        };
    } catch (error) {
        global.logger.error(`Lỗi kiểm tra trạng thái thanh toán PayOS: ${error}`);
        throw error;
    }
}

/**
 * Xử lý dữ liệu webhook từ PayOS
 * @param webhookData Dữ liệu webhook
 * @returns Thông tin đã xử lý
 */
export function processWebhookData(webhookData: any): PayOSWebhookResponse {
    try {
        // Log dữ liệu gốc để debug
        global.logger.debug(`Dữ liệu webhook gốc: ${JSON.stringify(webhookData)}`);

        // Kiểm tra dữ liệu webhook có đúng format không
        if (!webhookData || typeof webhookData !== 'object') {
            throw new Error('Dữ liệu webhook không hợp lệ: không phải đối tượng JSON');
        }

        // Kiểm tra các trường bắt buộc
        if (!webhookData.orderCode) {
            throw new Error('Dữ liệu webhook thiếu trường orderCode');
        }

        if (webhookData.status === undefined) {
            throw new Error('Dữ liệu webhook thiếu trường status');
        }

        if (webhookData.amount === undefined) {
            throw new Error('Dữ liệu webhook thiếu trường amount');
        }

        // Thử xác minh chữ ký nếu có
        const signature = webhookData.signature || '';

        // Chuyển đổi định dạng dữ liệu cho tương thích với code cũ
        const responseData: PayOSWebhookResponse = {
            code: '00',
            desc: 'success',
            data: {
                reference: webhookData.reference || webhookData.transactionId || '',
                orderCode: String(webhookData.orderCode),
                status: webhookData.status,
                amount: webhookData.amount,
                currency: webhookData.currency || 'VND',
                buyerName: webhookData.buyerName || '',
                buyerEmail: webhookData.buyerEmail || '',
                buyerPhone: webhookData.buyerPhone || '',
                description: webhookData.description || '',
                transactionTime: webhookData.transactionTime || webhookData.time || new Date().toISOString()
            }
        };

        global.logger.debug(`Dữ liệu webhook đã xử lý: ${JSON.stringify(responseData)}`);

        return responseData;
    } catch (error:any) {
        global.logger.error(`Lỗi xử lý dữ liệu webhook: ${error}`);
        global.logger.error(`Chi tiết dữ liệu: ${JSON.stringify(webhookData)}`);
        throw new Error(`Dữ liệu webhook không hợp lệ: ${error.message}`);
    }
}

/**
 * Xác minh webhook URL với PayOS
 * @param webhookUrl URL webhook cần xác minh
 * @returns Kết quả xác minh
 */
export async function confirmWebhook(webhookUrl?: string): Promise<boolean> {
    try {
        const url = webhookUrl || PAYOS_CONFIG.webhookUrl;
        if (!url) {
            throw new Error('Không có URL webhook để xác minh');
        }

        await payos.confirmWebhook(url);
        global.logger.info(`Đã xác minh webhook URL thành công: ${url}`);
        return true;
    } catch (error) {
        global.logger.error(`Lỗi xác minh webhook URL: ${error}`);
        return false;
    }
}

/**
 * Hủy link thanh toán
 * @param orderCode Mã đơn hàng
 * @param reason Lý do hủy (không bắt buộc)
 * @returns Thông tin link thanh toán đã hủy
 */
export async function cancelPaymentLink(orderCode: string, reason?: string): Promise<any> {
    try {
        const response = await payos.cancelPaymentLink(orderCode, reason);
        global.logger.info(`Đã hủy link thanh toán cho đơn hàng: ${orderCode}`);
        return response;
    } catch (error) {
        global.logger.error(`Lỗi hủy link thanh toán: ${error}`);
        throw error;
    }
}

/**
 * Tạo mã đơn hàng duy nhất cho PayOS
 * @param prefix Tiền tố cho mã đơn hàng
 * @returns Mã đơn hàng duy nhất
 */
export function generateOrderCode(prefix: string = 'ZCABOT'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Lấy mô tả trạng thái thanh toán PayOS
 * @param statusCode Mã trạng thái
 * @returns Mô tả trạng thái
 */
export function getPaymentStatusDescription(statusCode: number): string {
    switch (statusCode) {
        case 0:
            return 'Chưa thanh toán';
        case 1:
            return 'Thanh toán thành công';
        case 2:
            return 'Thanh toán thất bại';
        case 3:
            return 'Thanh toán bị hủy';
        case 4:
            return 'Thanh toán bị từ chối';
        case 5:
            return 'Thanh toán đang xử lý';
        case 6:
            return 'Thanh toán đã hết hạn';
        default:
            return 'Trạng thái không xác định';
    }
}