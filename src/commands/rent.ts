/**
 * File: src/commands/rent.ts
 * Mô tả: Lệnh thuê bot
 */

import { CommandParams } from '../types';
import { SUBSCRIPTION_PACKAGES, PackageType, UserPermission } from '../config';
import { initializeSubscription } from '../services/subscription';
import { formatRentMenu, formatPackageInfo } from '../utils/formatter';
import { sendTextMessage, sendError } from '../utils/messageHelper';

const rentCommand = {
    name: 'rent',
    aliases: ['thuê', 'thubot', 'hire'],
    description: 'Thuê bot cho nhóm',
    usage: '/rent [tên_gói]',
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

        // Hiển thị menu thuê nếu không có tham số
        if (args.length === 0) {
            const rentMenu = formatRentMenu(SUBSCRIPTION_PACKAGES);
            await sendTextMessage(rentMenu, groupId, true);
            return;
        }

        // Lấy tên gói
        const packageType = args[0].toLowerCase();

        // Kiểm tra gói có tồn tại không
        if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
            await sendError(
                `Gói "${packageType}" không tồn tại. Sử dụng /rent để xem danh sách gói.`,
                groupId,
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
                    groupId,
                    packageType as PackageType
                );

                // Gửi thông tin thanh toán
                const paymentMessage = `💳 THANH TOÁN GÓI ${packageInfo.name.toUpperCase()}\n\n` +
                    `💲 Số tiền: ${packageInfo.price.toLocaleString('vi-VN')}đ\n` +
                    `📝 Nội dung: Thuê bot ZCA - ${packageInfo.name}\n` +
                    `🔗 Link thanh toán: ${payment.paymentLink}\n\n` +
                    `📱 Vui lòng quét mã QR hoặc truy cập link trên để thanh toán.\n` +
                    `⏳ Link có hiệu lực trong 24 giờ.\n\n` +
                    `🔍 Lưu ý: Sau khi thanh toán thành công, bot sẽ tự động kích hoạt trong vòng 1-2 phút.`;

                // Gửi tin nhắn thông báo thanh toán
                await sendTextMessage(paymentMessage, groupId, true);

                // Gửi mã QR cho người dùng nếu có
                if (payment.qrCode) {
                    if (global.bot) {
                        try {
                            // Lưu QR code thành file tạm và gửi (nếu cần)
                            // Ở đây chúng ta đang giả định rằng PayOS trả về URL của QR code
                            // Trong thực tế, bạn cần kiểm tra dữ liệu qrCode và xử lý phù hợp
                            await global.bot.sendMessage({
                                msg: "Mã QR thanh toán PayOS:",
                                // Giả sử có method sendImage trong ZCA-JS API hoặc bạn cần triển khai nó
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

export default rentCommand;