/**
 * File: src/types.ts
 * Mô tả: Định nghĩa các kiểu dữ liệu sử dụng trong ứng dụng
 */

import { UserPermission, PackageType } from './config';

// Tham số lệnh
export interface CommandParams {
    message: any;                   // Tin nhắn gốc
    args: string[];                 // Các tham số lệnh
    userId: string;                 // ID người gửi
    groupId?: string;               // ID nhóm (nếu là tin nhắn nhóm)
    isGroup: boolean;               // Có phải tin nhắn nhóm không
}

// Định nghĩa lệnh
export interface Command {
    name: string;                   // Tên lệnh
    aliases?: string[];             // Bí danh lệnh
    description: string;            // Mô tả lệnh
    usage: string;                  // Cách sử dụng lệnh
    requiredPermission: UserPermission;  // Quyền yêu cầu để sử dụng
    execute: (params: CommandParams) => Promise<void>;  // Hàm thực thi lệnh
}

// Định nghĩa người dùng
export interface User {
    id: string;                     // ID Zalo của người dùng
    name: string;                   // Tên người dùng
    permission: UserPermission;     // Quyền của người dùng
}

// Định nghĩa nhóm
export interface Group {
    id: string;                     // ID nhóm Zalo
    name: string;                   // Tên nhóm
    isActive: boolean;              // Trạng thái kích hoạt
    activatedAt?: Date;             // Thời điểm kích hoạt
    expiresAt?: Date;               // Thời điểm hết hạn
}

// Định nghĩa thanh toán
export interface Payment {
    id: string;                     // ID thanh toán
    userId: string;                 // ID người thanh toán
    groupId: string;                // ID nhóm được thanh toán
    amount: number;                 // Số tiền
    payosTransactionId: string;     // ID giao dịch PayOS
    packageType: PackageType;       // Loại gói dịch vụ
    status: 'pending' | 'completed' | 'failed';  // Trạng thái thanh toán
    createdAt: Date;                // Thời điểm tạo
}

// Định nghĩa thông tin gói dịch vụ
export interface Package {
    name: string;                   // Tên gói
    price: number;                  // Giá gói (VND)
    days: number;                   // Số ngày hạn dùng
    description: string;            // Mô tả gói
}

// Định nghĩa PayOS response
export interface PayOSCreateLinkResponse {
    code: string;
    desc: string;
    data: {
        checkoutUrl: string;         // URL thanh toán
        qrCode: string;              // Mã QR
        orderId: string;             // Mã đơn hàng
        paymentLinkId?: string;      // ID link thanh toán (có thể có hoặc không)
    }
}

// Định nghĩa PayOS webhook
export interface PayOSWebhookResponse {
    code: string;
    desc: string;
    data: {
        reference: string;           // ID giao dịch
        orderCode: string;           // Mã đơn hàng
        status: number;              // Trạng thái (1 = thành công)
        amount: number;              // Số tiền
        currency: string;            // Đơn vị tiền tệ
        buyerName: string;           // Tên người mua
        buyerEmail: string;          // Email người mua
        buyerPhone: string;          // SĐT người mua
        description: string;         // Mô tả
        transactionTime: string;     // Thời gian giao dịch
        paymentMethod?: string;      // Phương thức thanh toán
        cardNumber?: string;         // 4 số cuối thẻ (nếu có)
        cardType?: string;           // Loại thẻ (nếu có)
        extraData?: any;             // Dữ liệu bổ sung
    }
}

// Cấu hình tạo link thanh toán PayOS
export interface PayOSCreateLinkRequest {
    orderCode: string;
    amount: number;
    description: string;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    cancelUrl?: string;
    returnUrl?: string;
    expiredAt?: number;
    extraData?: any;
}

// Định nghĩa Command Tracker
export interface CommandTracker {
    id: string;                    // ID bản ghi
    userId: string;                // ID người dùng
    commandName: string;           // Tên lệnh sử dụng
    usedAt: Date;                  // Thời điểm sử dụng
}

// Định nghĩa Response API
export interface ApiResponse<T = any> {
    success: boolean;              // Trạng thái thành công
    message: string;               // Thông báo
    data?: T;                      // Dữ liệu (nếu có)
    error?: string;                // Lỗi (nếu có)
    timestamp: number;             // Thời gian phản hồi
}

// Định nghĩa config cho middleware
export interface MiddlewareConfig {
    // Cấu hình middleware
    checkActivation: boolean;      // Có kiểm tra kích hoạt không
    checkPermission: boolean;      // Có kiểm tra quyền không
    checkSpam: boolean;            // Có kiểm tra spam không

    // Callback
    onSuccess?: () => Promise<void>;  // Callback khi thành công
    onFailure?: (reason: string) => Promise<void>;  // Callback khi thất bại
}

// Định nghĩa response của webhook
export interface WebhookResponse {
    success: boolean;              // Trạng thái thành công
    message: string;               // Thông báo
    code: number;                  // Mã trạng thái HTTP
}

// Các định nghĩa cho UI tin nhắn
export interface MentionObject {
    pos: number;
    len: number;
    uid: string;
}

export interface StyleObject {
    start: number;
    len: number;
    st: TextStyle;  // Cần định nghĩa enum TextStyle hoặc import từ module thích hợp
}

export interface MessageOptions {
    msg: string;
    mentions?: MentionObject[];
    styles?: StyleObject[];
    quote?: any;
    attachments?: string[];
    urgency?: string;  // Hoặc sử dụng enum Urgency nếu có
}

// Định nghĩa enum cho tin nhắn
export enum TextStyle {
    Bold = 'bold',
    Italic = 'italic',
    Red = 'red',
    Green = 'green',
    Blue = 'blue',
    Underline = 'underline',
    Strikethrough = 'strikethrough'
}

export enum Urgency {
    Normal = 'normal',
    Important = 'important'
}

export enum ThreadType {
    User = 'User',
    Group = 'Group'
}

export enum GroupEventType {
    JOIN = 'join',
    LEAVE = 'leave',
    UPDATE = 'update',
    ADD_ADMIN = 'add_admin',
    REMOVE_ADMIN = 'remove_admin',
    REMOVE_MEMBER = 'remove_member',
    BLOCK_MEMBER = 'block_member',
    JOIN_REQUEST = 'join_request'
}