import { SUBSCRIPTION_PACKAGES, PackageType } from '../config';
import { createPayment, updatePaymentStatus } from '../database/models/payment';
import { activateGroup, deactivateGroup, getExpiredGroups, findGroupById } from '../database/models/group';
import { createPaymentLink, generateOrderCode } from './payos';
import { sendTextMessage } from '../utils/messageHelper';
import { Package } from '../types';
import global from '../global';

/**
 * Khởi tạo quá trình thuê bot
 * @param userId ID người dùng
 * @param groupId ID nhóm
 * @param packageType Loại gói
 * @returns Object chứa paymentId và link thanh toán
 */
export async function initializeSubscription(
    userId: string,
    groupId: string,
    packageType: PackageType
): Promise<{ paymentId: string; paymentLink: string; qrCode: string }> {
    try {
        // Kiểm tra gói có tồn tại không
        if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
            throw new Error(`Gói ${packageType} không tồn tại`);
        }

        const packageInfo = SUBSCRIPTION_PACKAGES[packageType] as Package;

        // Kiểm tra thông tin nhóm
        const group = await findGroupById(groupId);

        if (!group) {
            throw new Error('Không tìm thấy thông tin nhóm');
        }

        // Tạo mã đơn hàng
        const orderCode = generateOrderCode();

        // Tạo thanh toán trong DB
        const payment = await createPayment(
            userId,
            groupId,
            packageInfo.price,
            packageType,
            orderCode
        );

        if (!payment) {
            throw new Error('Không thể tạo thanh toán trong cơ sở dữ liệu');
        }

        // Chuẩn bị mô tả thanh toán
        const isExtend = group.isActive;
        const actionText = isExtend ? "Gia hạn bot" : "Thuê bot";
        const description = `${actionText} ZCA - ${packageInfo.name} - ${packageInfo.days} ngày - Nhóm: ${group.name}`;

        // Tạo link thanh toán qua PayOS
        const paymentLinkResponse = await createPaymentLink(
            packageInfo.price,
            orderCode,
            description
        );

        // Ghi log thông tin tạo thanh toán
        global.logger.info(`Đã tạo thanh toán: ${packageType}, Số tiền: ${packageInfo.price}, Order: ${orderCode}`);

        // Trả về thông tin thanh toán
        return {
            paymentId: payment.id,
            paymentLink: paymentLinkResponse.data.checkoutUrl,
            qrCode: paymentLinkResponse.data.qrCode
        };
    } catch (error) {
        global.logger.error(`Lỗi khởi tạo thuê bot: ${error}`);
        throw error;
    }
}

/**
 * Xử lý thanh toán thành công
 * @param paymentId ID thanh toán
 * @param transactionId ID giao dịch PayOS
 * @returns true nếu xử lý thành công, false nếu không
 */
export async function processSuccessfulPayment(
    paymentId: string,
    transactionId: string
): Promise<boolean> {
    try {
        // Cập nhật trạng thái thanh toán
        const payment = await updatePaymentStatus(
            paymentId,
            'completed',
            transactionId
        );

        if (!payment) {
            throw new Error(`Không tìm thấy thanh toán với ID: ${paymentId}`);
        }

        // Lấy thông tin gói
        const packageInfo = SUBSCRIPTION_PACKAGES[payment.packageType];

        if (!packageInfo) {
            throw new Error(`Không tìm thấy thông tin gói: ${payment.packageType}`);
        }

        // Kích hoạt nhóm
        const activatedGroup = await activateGroup(payment.groupId, packageInfo.days);

        if (!activatedGroup) {
            throw new Error(`Không thể kích hoạt nhóm với ID: ${payment.groupId}`);
        }

        // Gửi thông báo
        if (global.bot) {
            const isExtended = activatedGroup.activatedAt && (new Date().getTime() - activatedGroup.activatedAt.getTime() > 3600000);
            const actionText = isExtended ? "GIA HẠN" : "KÍCH HOẠT";

            const message = `🎉 ${actionText} THÀNH CÔNG!\n\n` +
                `✅ Nhóm đã được ${isExtended ? "gia hạn" : "kích hoạt"} với gói ${packageInfo.name}.\n` +
                `✅ Thời hạn: ${packageInfo.days} ngày\n` +
                `✅ Hết hạn: ${activatedGroup.expiresAt?.toLocaleString('vi-VN')}\n\n` +
                `💰 Số tiền: ${packageInfo.price.toLocaleString('vi-VN')}đ\n` +
                `🧾 Mã giao dịch: ${transactionId}\n\n` +
                `Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!`;

            await sendTextMessage(message, payment.groupId, true);
        }

        global.logger.info(`Đã kích hoạt nhóm ${payment.groupId} thành công với gói ${payment.packageType}`);
        return true;
    } catch (error) {
        global.logger.error(`Lỗi xử lý thanh toán: ${error}`);
        return false;
    }
}

/**
 * Kiểm tra và vô hiệu hóa các nhóm hết hạn
 */
export async function checkExpiredGroups(): Promise<void> {
    try {
        const expiredGroups = await getExpiredGroups();

        if (expiredGroups.length === 0) {
            global.logger.info('Không có nhóm nào hết hạn');
            return;
        }

        global.logger.info(`Tìm thấy ${expiredGroups.length} nhóm đã hết hạn`);

        for (const group of expiredGroups) {
            await deactivateGroup(group.id);

            // Gửi thông báo
            if (global.bot) {
                const message = `⚠️ THÔNG BÁO HẾT HẠN\n\n` +
                    `Thời hạn thuê bot của nhóm đã kết thúc vào ${group.expiresAt?.toLocaleString('vi-VN')}.\n\n` +
                    `Để tiếp tục sử dụng dịch vụ, vui lòng gia hạn bằng cách sử dụng lệnh:\n` +
                    `- Lệnh gia hạn: ${process.env.BOT_PREFIX || '/'}extend [tên_gói]\n` +
                    `- Xem các gói dịch vụ: ${process.env.BOT_PREFIX || '/'}rent`;

                await sendTextMessage(message, group.id, true);
            }

            global.logger.info(`Đã vô hiệu hóa nhóm hết hạn: ${group.id}`);
        }
    } catch (error) {
        global.logger.error(`Lỗi kiểm tra nhóm hết hạn: ${error}`);
    }
}

/**
 * Lấy thông tin gói theo loại
 * @param packageType Loại gói
 * @returns Thông tin gói hoặc null
 */
export function getPackageInfo(packageType: string): Package | null {
    if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
        return null;
    }

    return SUBSCRIPTION_PACKAGES[packageType];
}

/**
 * Tạo thông báo nhắc nhở gia hạn cho nhóm sắp hết hạn
 * @param daysBeforeExpiration Số ngày trước khi hết hạn để nhắc nhở
 */
export async function sendExpirationReminders(daysBeforeExpiration: number = 3): Promise<void> {
    try {
        if (!global.db) return;

        const groupRepository = global.db.getRepository('groups');
        const now = new Date();

        // Import for TypeORM operators
        const { Between } = require('typeorm');

        // Tính ngày hết hạn trong khoảng cần nhắc nhở
        const startDate = new Date(now);
        startDate.setDate(now.getDate() + daysBeforeExpiration - 1);

        const endDate = new Date(now);
        endDate.setDate(now.getDate() + daysBeforeExpiration);

        // Tìm nhóm sắp hết hạn
        const groups = await groupRepository.find({
            where: {
                isActive: true,
                expiresAt: Between(startDate, endDate)
            }
        });

        // Gửi thông báo nhắc nhở
        for (const group of groups) {
            if (global.bot) {
                const daysLeft = Math.ceil((group.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                const message = `⏰ THÔNG BÁO HẾT HẠN\n\n` +
                    `Thời hạn thuê bot của nhóm sẽ kết thúc trong ${daysLeft} ngày (${group.expiresAt.toLocaleString('vi-VN')}).\n\n` +
                    `Để tiếp tục sử dụng dịch vụ, vui lòng gia hạn bằng cách sử dụng lệnh:\n` +
                    `- Lệnh gia hạn: ${process.env.BOT_PREFIX || '/'}extend [tên_gói]\n` +
                    `- Xem các gói dịch vụ: ${process.env.BOT_PREFIX || '/'}rent`;

                await sendTextMessage(message, group.id, true);
                global.logger.info(`Đã gửi thông báo nhắc nhở hết hạn cho nhóm: ${group.id}`);
            }
        }
    } catch (error) {
        global.logger.error(`Lỗi gửi thông báo nhắc nhở hết hạn: ${error}`);
    }
}