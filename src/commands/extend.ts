import { CommandParams } from '../types';
import { SUBSCRIPTION_PACKAGES, PackageType, UserPermission } from '../config'; // Import UserPermission
import { initializeSubscription } from '../services/subscription';
import { findGroupById } from '../database/models/group';
import { formatPackageInfo } from '../utils/formatter';
import { sendTextMessage, sendError } from '../utils/messageHelper';

const extendCommand = {
    name: 'extend',
    aliases: ['renew', 'giahan', 'gia-han'],
    description: 'Gia hạn thuê bot cho nhóm',
    usage: '/extend [tên_gói]',
    requiredPermission: UserPermission.MANAGER,  // Use enum instead of string

    execute: async (params: CommandParams) => {
        const { args, threadId, isGroup, userId } = params;

        // Kiểm tra nếu không phải nhóm
        if (!isGroup) {
            await sendError(
                'Lệnh này chỉ có thể sử dụng trong nhóm',
                userId,
                false
            );
            return;
        }

        // Kiểm tra xem nhóm có tồn tại trong database không
        const group = await findGroupById(threadId);
        if (!group) {
            await sendError(
                'Không tìm thấy thông tin nhóm trong cơ sở dữ liệu',
                threadId,
                true
            );
            return;
        }

        // Hiển thị thông tin gói nếu không có tham số
        if (args.length === 0) {
            let packageInfo = `📋 GIA HẠN DỊCH VỤ\n\n`;

            // Hiển thị thông tin nhóm
            packageInfo += `▶️ Tên nhóm: ${group.name}\n`;
            packageInfo += `▶️ Trạng thái: ${group.isActive ? '✅ Đã kích hoạt' : '❌ Chưa kích hoạt'}\n`;

            if (group.expiresAt) {
                packageInfo += `▶️ Hết hạn: ${group.expiresAt.toLocaleString('vi-VN')}\n\n`;
            }

            // Hiển thị các gói dịch vụ
            packageInfo += `📦 CÁC GÓI DỊCH VỤ:\n\n`;

            Object.entries(SUBSCRIPTION_PACKAGES).forEach(([key, pkg]) => {
                packageInfo += `🔹 ${pkg.name} - ${pkg.price.toLocaleString('vi-VN')}đ/${pkg.days} ngày\n`;
            });

            packageInfo += `\n💡 Để gia hạn, vui lòng gõ:\n/extend [tên_gói]`;

            await sendTextMessage(packageInfo, threadId, true);
            return;
        }

        // Lấy tên gói
        const packageType = args[0].toLowerCase();

        // Kiểm tra gói có tồn tại không
        if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
            await sendError(
                `Gói "${packageType}" không tồn tại. Sử dụng /extend để xem danh sách gói.`,
                threadId,
                true
            );
            return;
        }

        try {
            // Khởi tạo quá trình gia hạn (tương tự như thuê)
            const packageInfo = SUBSCRIPTION_PACKAGES[packageType];

            // Hiển thị thông tin xác nhận
            const confirmMessage = `🛒 THÔNG TIN GIA HẠN BOT\n\n` +
                formatPackageInfo(packageInfo) +
                `\n💰 Để tiếp tục thanh toán, vui lòng gõ:\n` +
                `/extend ${packageType} confirm`;

            // Nếu người dùng xác nhận thanh toán
            if (args.length > 1 && args[1].toLowerCase() === 'confirm') {
                // Khởi tạo thanh toán
                const payment = await initializeSubscription(
                    userId,
                    threadId,
                    packageType as PackageType
                );

                // Gửi thông tin thanh toán
                const paymentMessage = `💳 THANH TOÁN GIA HẠN ${packageInfo.name.toUpperCase()}\n\n` +
                    `💲 Số tiền: ${packageInfo.price.toLocaleString('vi-VN')}đ\n` +
                    `🔗 Link thanh toán: ${payment.paymentLink}\n\n` +
                    `📱 Vui lòng quét mã QR hoặc truy cập link trên để thanh toán.\n` +
                    `⏳ Link có hiệu lực trong 24 giờ.`;

                await sendTextMessage(paymentMessage, threadId, true);
            } else {
                // Gửi thông tin xác nhận
                await sendTextMessage(confirmMessage, threadId, true);
            }
        } catch (error: any) {
            await sendError(
                `Đã xảy ra lỗi khi tạo thanh toán: ${error.message}`,
                threadId,
                true
            );
        }
    }
};

export default extendCommand;