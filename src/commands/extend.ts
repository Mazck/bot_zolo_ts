import { CommandParams } from '../types';
import { SUBSCRIPTION_PACKAGES, PackageType, UserPermission } from '../config';
import { initializeSubscription } from '../services/subscription';
import { groupService } from '../database/services';
import { formatPackageInfo } from '../utils/formatter';
import { sendTextMessage, sendError } from '../utils/messageHelper';

const extendCommand = {
    name: 'extend',
    aliases: ['renew', 'giahan', 'gia-han'],
    description: 'Gia hạn thuê bot cho nhóm',
    usage: '/extend [tên_gói]',
    requiredPermission: UserPermission.MANAGER,

    execute: async (params: CommandParams) => {
        const { args, groupId, isGroup, userId } = params;

        // Kiểm tra nếu không phải nhóm
        if (!isGroup || !groupId) {
            await sendError(
                'Lệnh này chỉ có thể sử dụng trong nhóm',
                userId,
                false
            );
            return;
        }

        // Kiểm tra xem nhóm có tồn tại trong database không
        const group = await groupService().findGroupById(groupId);
        if (!group) {
            await sendError(
                'Không tìm thấy thông tin nhóm trong cơ sở dữ liệu',
                groupId,
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

            await sendTextMessage(packageInfo, groupId, true);
            return;
        }

        // Lấy tên gói
        const packageType = args[0].toLowerCase();

        // Kiểm tra gói có tồn tại không
        if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
            await sendError(
                `Gói "${packageType}" không tồn tại. Sử dụng /extend để xem danh sách gói.`,
                groupId,
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
                    groupId,
                    packageType as PackageType
                );

                // Gửi thông tin thanh toán
                const paymentMessage = `💳 THANH TOÁN GIA HẠN ${packageInfo.name.toUpperCase()}\n\n` +
                    `💲 Số tiền: ${packageInfo.price.toLocaleString('vi-VN')}đ\n` +
                    `📝 Nội dung: Gia hạn bot ZCA - ${packageInfo.name}\n` +
                    `🔗 Link thanh toán: ${payment.paymentLink}\n\n` +
                    `📱 Vui lòng quét mã QR hoặc truy cập link trên để thanh toán.\n` +
                    `⏳ Link có hiệu lực trong 24 giờ.\n\n` +
                    `🔍 Lưu ý: Sau khi thanh toán thành công, bot sẽ tự động gia hạn trong vòng 1-2 phút.`;

                // Gửi tin nhắn thông báo thanh toán
                await sendTextMessage(paymentMessage, groupId, true);

                // Gửi mã QR cho người dùng nếu có
                if (payment.qrCode) {
                    if (global.bot) {
                        try {
                            // Lưu QR code thành file tạm và gửi (nếu cần)
                            await global.bot.sendMessage({
                                msg: "Mã QR thanh toán PayOS:",
                                // attachments: [payment.qrCode]
                            }, groupId, true);
                        } catch (qrError) {
                            global.logger.error(`Lỗi gửi mã QR: ${qrError}`);
                        }
                    }
                }
            } else {
                // Gửi thông tin xác nhận
                await sendTextMessage(confirmMessage, groupId, true);
            }
        } catch (error: any) {
            await sendError(
                `Đã xảy ra lỗi khi tạo thanh toán: ${error.message}`,
                groupId,
                true
            );
        }
    }
};

export default extendCommand;