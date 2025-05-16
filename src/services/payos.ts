/**
 * File: src/services/payos.ts
 * Mô tả: Dịch vụ thanh toán qua PayOS.vn
 */

import axios from 'axios';
import crypto from 'crypto';
import { PAYOS_CONFIG } from '../config';
import { PayOSCreateLinkResponse, PayOSWebhookResponse } from '../types';
import global from '../global';

// Base URL của PayOS API
const PAYOS_API_BASE_URL = 'https://api-merchant.payos.vn/v2';

/**
 * Tạo chuỗi checksum cho PayOS
 * @param data Dữ liệu cần tạo checksum
 * @returns Chuỗi checksum
 */
function createChecksum(data: any): string {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto
        .createHmac('sha256', PAYOS_CONFIG.checksumKey)
        .update(jsonData)
        .digest('hex');
}

/**
 * Xác thực checksum từ webhook PayOS
 * @param data Dữ liệu từ webhook
 * @param checksumFromHeader Chuỗi checksum từ header
 * @returns true nếu hợp lệ, false nếu không
 */
export function verifyWebhookChecksum(data: any, checksumFromHeader: string): boolean {
    const calculatedChecksum = createChecksum(data);
    return calculatedChecksum === checksumFromHeader;
}

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
        const apiUrl = `${PAYOS_API_BASE_URL}/payment-requests`;

        // Thời gian hết hạn: 24 giờ mặc định hoặc từ cấu hình
        const expiryHours = PAYOS_CONFIG.expiryTime || 24;
        const defaultExpireTime = Math.floor(Date.now() / 1000) + expiryHours * 60 * 60;

        // Dữ liệu thanh toán
        const data = {
            orderCode,
            amount,
            description,
            buyerName: buyerName || '',
            buyerEmail: buyerEmail || '',
            buyerPhone: buyerPhone || '',
            cancelUrl: cancelUrl || PAYOS_CONFIG.cancelUrl || `${PAYOS_CONFIG.webhookUrl}/payment/cancel`,
            returnUrl: returnUrl || PAYOS_CONFIG.returnUrl || `${PAYOS_CONFIG.webhookUrl}/payment/callback`,
            expiredAt: defaultExpireTime
        };

        // Tạo checksum
        const checksum = createChecksum(data);

        // Gửi yêu cầu tạo link thanh toán
        const response = await axios.post(apiUrl, data, {
            headers: {
                'x-client-id': PAYOS_CONFIG.clientId,
                'x-api-key': PAYOS_CONFIG.apiKey,
                'Content-Type': 'application/json',
                'x-checksum': checksum
            }
        });

        // Kiểm tra phản hồi từ PayOS
        if (response.data.code !== '00') {
            throw new Error(`PayOS API Error: ${response.data.desc}`);
        }

        global.logger.info(`Đã tạo link thanh toán PayOS thành công cho đơn hàng: ${orderCode}`);
        return response.data;
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
        const apiUrl = `${PAYOS_API_BASE_URL}/payment-requests/${orderCode}`;

        const response = await axios.get(apiUrl, {
            headers: {
                'x-client-id': PAYOS_CONFIG.clientId,
                'x-api-key': PAYOS_CONFIG.apiKey,
                'Content-Type': 'application/json'
            }
        });

        // Kiểm tra phản hồi từ PayOS
        if (response.data.code !== '00') {
            throw new Error(`PayOS API Error: ${response.data.desc}`);
        }

        return response.data;
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
    // Kiểm tra và chuẩn hóa dữ liệu
    if (!webhookData || !webhookData.data) {
        throw new Error('Dữ liệu webhook không hợp lệ');
    }

    return {
        code: webhookData.code,
        desc: webhookData.desc,
        data: {
            reference: webhookData.data.reference || '',
            orderCode: webhookData.data.orderCode || '',
            status: webhookData.data.status || 0,
            amount: webhookData.data.amount || 0,
            currency: webhookData.data.currency || 'VND',
            buyerName: webhookData.data.buyerName || '',
            buyerEmail: webhookData.data.buyerEmail || '',
            buyerPhone: webhookData.data.buyerPhone || '',
            description: webhookData.data.description || '',
            transactionTime: webhookData.data.transactionTime || ''
        }
    };
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