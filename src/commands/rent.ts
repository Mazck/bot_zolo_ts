import { CommandParams } from '../types';
import { SUBSCRIPTION_PACKAGES, PackageType, UserPermission } from '../config';
import { paymentService, groupService } from '../database/services';
import { formatRentMenu, formatPackageInfo } from '../utils/formatter';
import { sendTextMessage, sendError } from '../utils/messageHelper';
import { createPaymentLink, generateOrderCode } from '../services/payos';
import global from '../global';
import QRCode from 'qrcode';
import path from "path";

const rentCommand = {
    name: 'rent',
    aliases: ['thuê', 'thubot', 'hire'],
    description: 'Thuê bot cho nhóm',
    usage: '/rent [tên_gói]',
    requiredPermission: UserPermission.MANAGER,

    execute: async (params: CommandParams): Promise<void> => {
        const { args, groupId, isGroup, userId } = params;

        // Check if in a group
        if (!isGroup || !groupId) {
            await sendError(
                'Lệnh này chỉ có thể sử dụng trong nhóm',
                userId,
                false
            );
            return;
        }

        // If no arguments, show rental packages
        if (args.length === 0) {
            const rentMenu = formatRentMenu(SUBSCRIPTION_PACKAGES);
            await sendTextMessage(rentMenu, groupId, true);
            return;
        }

        // Get package type
        const packageType = args[0].toLowerCase();

        // Check if package exists
        if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
            await sendError(
                `Gói "${packageType}" không tồn tại. Sử dụng /rent để xem danh sách gói.`,
                groupId,
                true
            );
            return;
        }

        try {
            // Get package info
            const packageInfo = SUBSCRIPTION_PACKAGES[packageType as PackageType];

            // Check if the package exists
            if (!packageInfo) {
                await sendError(
                    `Gói "${packageType}" không tồn tại. Sử dụng /rent để xem danh sách gói.`,
                    groupId,
                    true
                );
                return;
            }

            // Show confirmation info
            const confirmMessage = `🛒 THÔNG TIN THUÊ BOT\n\n` +
                formatPackageInfo(packageInfo) +
                `\n💰 Để tiếp tục thanh toán, vui lòng gõ:\n` +
                `/rent ${packageType} confirm`;

            // If user confirms payment
            if (args.length > 1 && args[1].toLowerCase() === 'confirm') {
                // Get or create group
                const group = await groupService().findGroupById(groupId);

                if (!group) {
                    // Create group if not exists
                    await groupService().createOrUpdateGroup(groupId, "Nhóm Zalo");
                }

                // Generate order code
                const orderCode = generateOrderCode();

                // Create payment record
                const payment = await paymentService().createPayment(
                    userId,
                    groupId,
                    packageInfo.price,
                    packageType as PackageType,
                    orderCode,
                    `Thuê bot ZCA - ${packageInfo.name} - Nhóm ${groupId}`
                );

                if (!payment) {
                    throw new Error('Không thể tạo thanh toán trong cơ sở dữ liệu');
                }

                // Create payment link with PayOS
                const isExtend = group?.isActive ?? false;
                const actionText = isExtend ? "Gia hạn bot" : "Thuê bot";
                const description = `${packageInfo.days} ngày - Nhóm: ${group?.name || groupId}`;
                console.log(description);
                const paymentLinkResponse = await createPaymentLink(
                    packageInfo.price,
                    orderCode,
                    description
                );

                // Send payment information
                const paymentMessage = `💳 THANH TOÁN GÓI ${packageInfo.name.toUpperCase()}\n\n` +
                    `💲 Số tiền: ${packageInfo.price.toLocaleString('vi-VN')}đ\n` +
                    `📝 Nội dung: Thuê bot ZCA - ${packageInfo.name}\n` +
                    `🔗 Link thanh toán: ${paymentLinkResponse.data.checkoutUrl}\n\n` +
                    `📱 Vui lòng quét mã QR hoặc truy cập link trên để thanh toán.\n` +
                    `⏳ Link có hiệu lực trong 24 giờ.\n\n` +
                    `🔍 Lưu ý: Sau khi thanh toán thành công, bot sẽ tự động kích hoạt trong vòng 1-2 phút.`;

                await sendTextMessage(paymentMessage, groupId, true);

                // Send QR code if available
                if (paymentLinkResponse.data.qrCode && global.bot) {
                    try {
                        const cacheDir = path.resolve(__dirname,'./cache');
                        const qrImagePath = path.join(cacheDir, 'qrCode.png');
                        await QRCode.toFile(qrImagePath, paymentLinkResponse.data.qrCode);

                        await global.bot.sendMessage({
                            msg: "Mã QR thanh toán PayOS:",
                            attachments: [path.resolve(qrImagePath)]
                        }, groupId, true);
                    } catch (qrError) {
                        global.logger.error(`Lỗi gửi mã QR: ${qrError}`);
                    }
                }
            } else {
                // Send confirmation message
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