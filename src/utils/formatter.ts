import { TextStyle } from '../types/index';
import { sendTextMessage, sendStyledMessage } from './messageHelper';

// === FORMATTERS (ĐỊNH DẠNG NỘI DUNG) ===

/**
 * Định dạng thông báo
 * @param title Tiêu đề
 * @param message Nội dung
 * @returns Chuỗi đã định dạng
 */
export function formatNotification(title: string, message: string): string {
    return `📢 ${title}\n\n${message}`;
}

/**
 * Định dạng thông báo lỗi
 * @param message Nội dung lỗi
 * @returns Chuỗi đã định dạng
 */
export function formatError(message: string): string {
    return `❌ Lỗi: ${message}`;
}

/**
 * Định dạng thông báo thành công
 * @param message Nội dung thông báo
 * @returns Chuỗi đã định dạng
 */
export function formatSuccess(message: string): string {
    return `✅ ${message}`;
}

/**
 * Định dạng menu thuê bot
 * @param packages Danh sách gói dịch vụ
 * @returns Chuỗi đã định dạng
 */
export function formatRentMenu(packages: Record<string, any>): string {
    let menu = '📋 BẢNG GIÁ THUÊ BOT\n\n';

    Object.entries(packages).forEach(([key, pkg]) => {
        menu += `🔹 ${pkg.name} - ${formatCurrency(pkg.price)}\n`;
        menu += `  ↪ ${pkg.description}\n\n`;
    });

    menu += '📩 Để thuê bot, hãy gõ: /rent [tên_gói]\n';
    menu += '🔍 Để xem chi tiết, hãy gõ: /help';

    return menu;
}

/**
 * Định dạng thông tin gói thuê
 * @param packageInfo Thông tin gói
 * @returns Chuỗi đã định dạng
 */
export function formatPackageInfo(packageInfo: any): string {
    return `
📦 ${packageInfo.name}
💲 Giá: ${formatCurrency(packageInfo.price)}
⏱️ Thời hạn: ${packageInfo.days} ngày
📝 Mô tả: ${packageInfo.description}
`;
}

/**
 * Định dạng thông tin nhóm
 * @param group Thông tin nhóm
 * @returns Chuỗi đã định dạng
 */
export function formatGroupInfo(group: any): string {
    const status = group.isActive ? '✅ Đã kích hoạt' : '❌ Chưa kích hoạt';
    const expiration = group.expiresAt
        ? `⏳ Hết hạn: ${new Date(group.expiresAt).toLocaleString('vi-VN')}`
        : '⏳ Hết hạn: Chưa kích hoạt';

    return `
📊 THÔNG TIN NHÓM
📝 Tên nhóm: ${group.name}
🆔 ID nhóm: ${group.id}
${status}
${expiration}
`;
}

/**
 * Định dạng thông tin thanh toán
 * @param payment Thông tin thanh toán
 * @param packageInfo Thông tin gói
 * @returns Chuỗi đã định dạng
 */
export function formatPaymentInfo(payment: any, packageInfo: any): string {
    return `
💰 THÔNG TIN THANH TOÁN
📦 Gói: ${packageInfo.name}
💲 Số tiền: ${formatCurrency(payment.amount)}
🧾 Mã giao dịch: ${payment.payosTransactionId || 'Chưa thanh toán'}
📅 Ngày tạo: ${new Date(payment.createdAt).toLocaleString('vi-VN')}
`;
}

/**
 * Định dạng tiền tệ (VND)
 * @param amount Số tiền
 * @returns Chuỗi đã định dạng
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// === MESSAGE SENDERS (GỬI TIN NHẮN) ===

/**
 * Định dạng tin nhắn thông báo và gửi
 * @param title Tiêu đề thông báo
 * @param message Nội dung thông báo
 * @param threadId ID người nhận
 * @param isGroup Là nhóm hay không
 */
export async function sendNotification(
    title: string,
    message: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    const formattedMessage = formatNotification(title, message);
    return await sendTextMessage(formattedMessage, threadId, isGroup);
}

/**
 * Định dạng tin nhắn lỗi và gửi
 * @param message Nội dung lỗi
 * @param threadId ID người nhận
 * @param isGroup Là nhóm hay không
 */
export async function sendError(
    message: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    const formattedMessage = formatError(message);

    const styles = [
        {
            start: 0,
            len: formattedMessage.length,
            style: TextStyle.Red
        }
    ];

    return await sendStyledMessage(formattedMessage, threadId, styles, isGroup);
}

/**
 * Định dạng tin nhắn thành công và gửi
 * @param message Nội dung thông báo
 * @param threadId ID người nhận
 * @param isGroup Là nhóm hay không
 */
export async function sendSuccess(
    message: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    const formattedMessage = formatSuccess(message);

    const styles = [
        {
            start: 0,
            len: formattedMessage.length,
            style: TextStyle.Green
        }
    ];

    return await sendStyledMessage(formattedMessage, threadId, styles, isGroup);
}