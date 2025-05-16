import { CommandParams } from '../types';
import { SUBSCRIPTION_PACKAGES, PackageType, UserPermission } from '../config'; // Import UserPermission
import { initializeSubscription } from '../services/subscription';
import { formatRentMenu, formatPackageInfo } from '../utils/formatter';
import { sendTextMessage, sendError } from '../utils/messageHelper';

const rentCommand = {
    name: 'rent',
    aliases: ['thuê', 'thubot', 'hire'],
    description: 'Thuê bot cho nhóm',
    usage: '/rent [tên_gói]',
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

        // Hiển thị menu thuê nếu không có tham số
        if (args.length === 0) {
            const rentMenu = formatRentMenu(SUBSCRIPTION_PACKAGES);
            await sendTextMessage(rentMenu, threadId, true);
            return;
        }

        // Lấy tên gói
        const packageType = args[0].toLowerCase();

        // Kiểm tra gói có tồn tại không
        if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
            await sendError(
                `Gói "${packageType}" không tồn tại. Sử dụng /rent để xem danh sách gói.`,
                threadId,
                true
            );
            return;
        }

        try {
            // Khởi tạo quá trình thuê
            const packageInfo = SUBSCRIPTION_PACKAGES[packageType];

            // Hiển thị thông tin xác nhận
            const confirmMessage = `🛒 THÔNG TIN THUÊ BOT\n\n` +
                formatPackageInfo(packageInfo) +
                `\n💰 Để tiếp tục thanh toán, vui lòng gõ:\n` +
                `/rent ${packageType} confirm`;

            // Nếu người dùng xác nhận thanh toán
            if (args.length > 1 && args[1].toLowerCase() === 'confirm') {
                // Khởi tạo thanh toán
                const payment = await initializeSubscription(
                    userId,
                    threadId,
                    packageType as PackageType
                );

                // Gửi thông tin thanh toán
                const paymentMessage = `💳 THANH TOÁN GÓI ${packageInfo.name.toUpperCase()}\n\n` +
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

export default rentCommand;