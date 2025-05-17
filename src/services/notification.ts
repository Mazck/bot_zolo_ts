import { TextStyle } from '../types';
import { sendTextMessage, sendStyledMessage, sendAttachmentMessage } from '../utils/messageHelper';
import { userService , groupService } from '../database/services';
import { createPaymentLink, generateOrderCode } from './payos';
import { formatCurrency } from '../utils/formatter';
import { SUBSCRIPTION_PACKAGES, PackageType } from '../config';
import crypto from 'crypto';
import global from '../global';
import { Package } from '../types';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { promises as fsPromises } from 'fs';

// Thư mục lưu trữ QR code tạm thời
const TMP_DIR = path.join(process.cwd(), 'tmp');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Lưu QR code từ chuỗi Base64
 * @param base64Data Chuỗi Base64 của QR code (từ PayOS)
 * @returns Đường dẫn đến file QR code đã lưu
 */
async function saveQRCodeFromBase64(base64Data: string): Promise<string> {
    try {
        // Tạo tên file
        const fileName = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
        const filePath = path.join(TMP_DIR, fileName);

        // Chuyển đổi chuỗi Base64 thành buffer
        const base64Image = base64Data.split(';base64,').pop();
        if (!base64Image) {
            throw new Error('Chuỗi Base64 không hợp lệ');
        }

        const imageBuffer = Buffer.from(base64Image, 'base64');

        // Lưu file
        await fsPromises.writeFile(filePath, imageBuffer);

        return filePath;
    } catch (error) {
        global.logger.error(`Lỗi lưu QR code từ Base64: ${error}`);
        return '';
    }
}

/**
 * Tạo QR code với nội dung tùy chỉnh (fallback nếu không có QR từ PayOS)
 * @param content Nội dung của QR code
 * @param size Kích thước QR code (mặc định 300)
 * @returns Đường dẫn đến file QR code hoặc null nếu có lỗi
 */
export async function generateQRCode(content: string, size: number = 300): Promise<string | null> {
    try {
        // Mã hóa nội dung để sử dụng trong URL
        const encodedContent = encodeURIComponent(content);

        // Sử dụng API Google Charts để tạo QR code
        const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodedContent}`;

        // Tạo tên file
        const fileName = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
        const filePath = path.join(TMP_DIR, fileName);

        // Tải QR code về
        const response = await axios({
            method: 'GET',
            url: qrUrl,
            responseType: 'stream'
        });

        // Lưu file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (error) {
        global.logger.error(`Lỗi tạo QR code: ${error}`);
        return null;
    }
}

/**
 * Tạo mã thanh toán tùy chỉnh
 * @param groupId ID nhóm
 * @param packageType Loại gói
 * @returns Mã thanh toán
 */
export function generatePaymentCode(groupId: string, packageType: PackageType): string {
    const timestamp = Date.now();
    const secret = crypto.createHash('md5').update(`${groupId}-${timestamp}`).digest('hex').substring(0, 8);
    return `ZCA-${packageType.toUpperCase()}-${groupId.substring(0, 8)}-${secret}`;
}

/**
 * Tạo thông tin thanh toán và gửi thông báo
 * @param userId ID người dùng thanh toán
 * @param groupId ID nhóm
 * @param packageType Loại gói dịch vụ
 * @returns true nếu gửi thành công, false nếu không
 */
export async function sendPaymentNotification(
    userId: string,
    groupId: string,
    packageType: PackageType
): Promise<boolean> {
    try {
        // Kiểm tra nhóm và gói dịch vụ
        const group = await groupService().findGroupById(groupId);
        if (!group) {
            global.logger.error(`Không tìm thấy nhóm: ${groupId}`);
            return false;
        }

        const packageInfo = SUBSCRIPTION_PACKAGES[packageType] as Package;
        if (!packageInfo) {
            global.logger.error(`Không tìm thấy gói dịch vụ: ${packageType}`);
            return false;
        }

        // Kiểm tra người dùng
        const user = await userService().findUserById(userId);
        if (!user) {
            global.logger.error(`Không tìm thấy người dùng: ${userId}`);
            return false;
        }

        // Tạo mã thanh toán và orderCode
        const paymentCode = generatePaymentCode(groupId, packageType);
        const orderCode = generateOrderCode();

        // Tạo nội dung QR
        const qrContent = `ZCA Bot Payment
Group: ${group.name}
GroupID: ${groupId}
Package: ${packageInfo.name}
Amount: ${formatCurrency(packageInfo.price)}
Time: ${new Date().toISOString()}
Code: ${paymentCode}`;

        // Tạo thông tin chuyển khoản với PayOS
        const isExtend = group.isActive;
        const actionText = isExtend ? "Gia hạn bot" : "Thuê bot";
        const description = `${actionText} ZCA - ${packageInfo.name} - Nhóm: ${group.name} - Mã: ${paymentCode}`;

        try {
            // Tạo link thanh toán từ PayOS để lấy QR code
            const paymentLinkData = await createPaymentLink(
                packageInfo.price,
                orderCode,
                description,
                user.id,
                '', // email
                '', // phone
            );

            // Lưu QR code từ PayOS
            let qrFilePath = '';
            if (paymentLinkData.data.qrCode) {
                qrFilePath = await saveQRCodeFromBase64(paymentLinkData.data.qrCode);
            }

            // Nếu không thể lưu QR code từ PayOS, tạo QR code bằng thư viện
            if (!qrFilePath) {
                qrFilePath = await generateQRCode(qrContent) || '';
            }

            // Tạo thông báo thanh toán
            const paymentMessage = `💰 THANH TOÁN ${actionText.toUpperCase()} BOT\n\n` +
                `👥 Nhóm: ${group.name}\n` +
                `📦 Gói: ${packageInfo.name}\n` +
                `💲 Số tiền: ${formatCurrency(packageInfo.price)}\n` +
                `⏱️ Thời hạn: ${packageInfo.days} ngày\n\n` +
                `🔖 Mã thanh toán: ${paymentCode}\n\n` +
                `🔗 Link thanh toán: ${paymentLinkData.data.checkoutUrl}\n\n` +
                `📱 Hoặc quét mã QR bên dưới để thanh toán\n` +
                `⏳ Link có hiệu lực trong 24 giờ`;

            // Gửi tin nhắn thông báo thanh toán
            await sendTextMessage(paymentMessage, groupId, true);

            // Gửi mã QR
            if (qrFilePath) {
                try {
                    await sendAttachmentMessage(
                        "🔍 Quét mã QR để thanh toán hoặc sử dụng link thanh toán",
                        groupId,
                        [qrFilePath],
                        true
                    );

                    // Xóa file QR sau khi gửi
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(qrFilePath);
                        } catch (e) {
                            global.logger.error(`Lỗi xóa file QR tạm: ${e}`);
                        }
                    }, 5000);
                } catch (qrError) {
                    global.logger.error(`Lỗi gửi mã QR: ${qrError}`);
                }
            }

            global.logger.info(`Đã gửi thông báo thanh toán cho nhóm: ${groupId}, gói: ${packageType}`);
            return true;
        } catch (payosError) {
            global.logger.error(`Lỗi tạo payment link từ PayOS: ${payosError}`);

            // Fallback: Tạo thông tin chuyển khoản thủ công nếu PayOS lỗi
            // Tạo QR code thủ công
            const qrFilePath = await generateQRCode(qrContent);

            // Tạo thông báo chuyển khoản thủ công
            const manualPaymentMessage = `💰 THANH TOÁN ${actionText.toUpperCase()} BOT\n\n` +
                `👥 Nhóm: ${group.name}\n` +
                `📦 Gói: ${packageInfo.name}\n` +
                `💲 Số tiền: ${formatCurrency(packageInfo.price)}\n` +
                `⏱️ Thời hạn: ${packageInfo.days} ngày\n\n` +
                `🔖 Mã thanh toán: ${paymentCode}\n\n` +
                `🏦 Chuyển khoản theo thông tin dưới đây:\n` +
                `👤 Chủ tài khoản: NGUYEN VAN A\n` +
                `💳 Số tài khoản: 1234567890\n` +
                `🏛️ Ngân hàng: VIETCOMBANK\n` +
                `📝 Nội dung: ${paymentCode}\n\n` +
                `⚠️ Lưu ý: Sau khi chuyển khoản, vui lòng gửi biên lai với nội dung /confirm ${paymentCode}`;

            // Gửi tin nhắn thông báo thanh toán thủ công
            await sendTextMessage(manualPaymentMessage, groupId, true);

            // Gửi mã QR nếu có
            if (qrFilePath) {
                try {
                    await sendAttachmentMessage(
                        "🔍 Quét mã QR để xem thông tin chuyển khoản",
                        groupId,
                        [qrFilePath],
                        true
                    );

                    // Xóa file QR sau khi gửi
                    setTimeout(() => {
                        try {
                            fs.unlinkSync(qrFilePath);
                        } catch (e) {
                            global.logger.error(`Lỗi xóa file QR tạm: ${e}`);
                        }
                    }, 5000);
                } catch (qrError) {
                    global.logger.error(`Lỗi gửi mã QR: ${qrError}`);
                }
            }

            global.logger.info(`Đã gửi thông báo thanh toán thủ công cho nhóm: ${groupId}, gói: ${packageType}`);
            return true;
        }
    } catch (error) {
        global.logger.error(`Lỗi gửi thông báo thanh toán: ${error}`);
        return false;
    }
}

/**
 * Gửi thông báo thanh toán thành công
 * @param groupId ID nhóm
 * @param packageType Loại gói
 * @param transactionId ID giao dịch
 * @param expiryDate Ngày hết hạn mới
 * @returns true nếu gửi thành công, false nếu không
 */
export async function sendSuccessNotification(
    groupId: string,
    packageType: PackageType,
    transactionId: string,
    expiryDate: Date
): Promise<boolean> {
    try {
        // Kiểm tra nhóm và gói dịch vụ
        const group = await groupService().findGroupById(groupId);
        if (!group) {
            global.logger.error(`Không tìm thấy nhóm: ${groupId}`);
            return false;
        }

        const packageInfo = SUBSCRIPTION_PACKAGES[packageType] as Package;
        if (!packageInfo) {
            global.logger.error(`Không tìm thấy gói dịch vụ: ${packageType}`);
            return false;
        }

        // Xác định loại hành động (thuê mới hay gia hạn)
        const isExtend = group.activatedAt && (new Date().getTime() - group.activatedAt.getTime() > 3600000);
        const actionText = isExtend ? "GIA HẠN" : "KÍCH HOẠT";

        // Tạo thông báo thành công
        const message = `🎉 ${actionText} THÀNH CÔNG!\n\n` +
            `✅ Nhóm đã được ${isExtend ? "gia hạn" : "kích hoạt"} với gói ${packageInfo.name}.\n` +
            `✅ Thời hạn: ${packageInfo.days} ngày\n` +
            `✅ Hết hạn: ${expiryDate.toLocaleString('vi-VN')}\n\n` +
            `💰 Số tiền: ${formatCurrency(packageInfo.price)}\n` +
            `🧾 Mã giao dịch: ${transactionId}\n\n` +
            `📢 Cảm ơn bạn đã sử dụng dịch vụ ZCA Bot!`;

        // Tạo style cho tin nhắn
        const styles = [
            {
                start: 0,
                len: message.length,
                style: TextStyle.Green
            }
        ];

        // Gửi tin nhắn thông báo thành công
        await sendStyledMessage(message, groupId, styles, true);

        global.logger.info(`Đã gửi thông báo thành công cho nhóm: ${groupId}, gói: ${packageType}`);
        return true;
    } catch (error) {
        global.logger.error(`Lỗi gửi thông báo thành công: ${error}`);
        return false;
    }
}

/**
 * Gửi thông báo nhắc nhở thanh toán
 * @param groupId ID nhóm
 * @param daysLeft Số ngày còn lại
 * @returns true nếu gửi thành công, false nếu không
 */
export async function sendReminderNotification(
    groupId: string,
    daysLeft: number
): Promise<boolean> {
    try {
        // Kiểm tra nhóm
        const group = await groupService().findGroupById(groupId);
        if (!group) {
            global.logger.error(`Không tìm thấy nhóm: ${groupId}`);
            return false;
        }

        // Tạo thông báo nhắc nhở
        const message = `⏰ THÔNG BÁO SẮP HẾT HẠN\n\n` +
            `Thời hạn sử dụng bot của nhóm "${group.name}" sẽ kết thúc trong ${daysLeft} ngày ` +
            `(${group.expiresAt?.toLocaleString('vi-VN')}).\n\n` +
            `Để tiếp tục sử dụng dịch vụ, vui lòng gia hạn bằng lệnh:\n` +
            `- /extend để xem các gói gia hạn\n` +
            `- /extend [tên_gói] để gia hạn gói cụ thể\n` +
            `- /transfer [tên_gói] để thanh toán bằng chuyển khoản\n\n` +
            `📢 Gia hạn ngay để không bị gián đoạn dịch vụ!`;

        // Gửi tin nhắn nhắc nhở
        await sendTextMessage(message, groupId, true);

        global.logger.info(`Đã gửi thông báo nhắc nhở cho nhóm: ${groupId}, còn ${daysLeft} ngày`);
        return true;
    } catch (error) {
        global.logger.error(`Lỗi gửi thông báo nhắc nhở: ${error}`);
        return false;
    }
}

/**
 * Gửi thông báo hết hạn
 * @param groupId ID nhóm
 * @returns true nếu gửi thành công, false nếu không
 */
export async function sendExpirationNotification(groupId: string): Promise<boolean> {
    try {
        // Kiểm tra nhóm
        const group = await groupService().findGroupById(groupId);
        if (!group) {
            global.logger.error(`Không tìm thấy nhóm: ${groupId}`);
            return false;
        }

        // Tạo thông báo hết hạn
        const message = `⚠️ THÔNG BÁO HẾT HẠN\n\n` +
            `Thời hạn sử dụng bot của nhóm "${group.name}" đã kết thúc vào ${group.expiresAt?.toLocaleString('vi-VN')}.\n\n` +
            `Bot đã bị vô hiệu hóa trong nhóm này. Để tiếp tục sử dụng, vui lòng gia hạn bằng lệnh:\n` +
            `- /extend để xem các gói gia hạn\n` +
            `- /extend [tên_gói] để gia hạn gói cụ thể\n` +
            `- /transfer [tên_gói] để thanh toán bằng chuyển khoản\n\n` +
            `📢 Gia hạn ngay để tiếp tục sử dụng dịch vụ!`;

        // Gửi tin nhắn hết hạn
        await sendTextMessage(message, groupId, true);

        global.logger.info(`Đã gửi thông báo hết hạn cho nhóm: ${groupId}`);
        return true;
    } catch (error) {
        global.logger.error(`Lỗi gửi thông báo hết hạn: ${error}`);
        return false;
    }
}

export default {
    generateQRCode,
    generatePaymentCode,
    sendPaymentNotification,
    sendSuccessNotification,
    sendReminderNotification,
    sendExpirationNotification
};