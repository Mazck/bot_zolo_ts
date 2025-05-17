import { SUBSCRIPTION_PACKAGES, PackageType } from '../config';
import { paymentService, groupService, subscriptionService } from '../database/services';
import { createPaymentLink, generateOrderCode } from './payos';
import { sendTextMessage, sendError } from '../utils/messageHelper';
import { Package } from '../types';
import global from '../global';
import { sendSuccessNotification } from './notification';

/**
 * Initializes a subscription process for a group
 * @param userId ID of the user requesting the subscription
 * @param groupId ID of the group to subscribe
 * @param packageType Type of subscription package
 * @returns Payment information with links
 */
export async function initializeSubscription(
    userId: string,
    groupId: string,
    packageType: PackageType
): Promise<{ paymentId: string; paymentLink: string; qrCode: string }> {
    try {
        // Check if package exists
        if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
            throw new Error(`Package ${packageType} does not exist`);
        }

        const packageInfo = SUBSCRIPTION_PACKAGES[packageType] as Package;

        // Check if group exists
        const group = await groupService().findGroupById(groupId);

        if (!group) {
            throw new Error('Group not found');
        }

        // Generate order code
        const orderCode = generateOrderCode();

        // Create payment record in database
        const payment = await paymentService().createPayment(
            userId,
            groupId,
            packageInfo.price,
            packageType,
            orderCode,
            `${group.isActive ? 'Gia hạn' : 'Thuê'} bot ZCA - ${packageInfo.name} - Nhóm: ${group.name}`
        );

        if (!payment) {
            throw new Error('Failed to create payment record in database');
        }

        // Determine if this is a new subscription or renewal
        const isExtend = group.isActive;
        const actionText = isExtend ? "Gia hạn bot" : "Thuê bot";
        const description = `${packageInfo.name} - ${packageInfo.days} ngày - Nhóm: ${group.name || groupId}`;

        // Create payment link via PayOS
        const paymentLinkResponse = await createPaymentLink(
            packageInfo.price,
            orderCode,
            description,
            '', // buyerName
            '', // buyerEmail
            '', // buyerPhone
        );

        // Log payment creation
        global.logger.info(`Created ${actionText} payment: ${packageType}, Amount: ${packageInfo.price}, Order: ${orderCode}`);

        // Return payment information
        return {
            paymentId: payment.id,
            paymentLink: paymentLinkResponse.data.checkoutUrl,
            qrCode: paymentLinkResponse.data.qrCode
        };
    } catch (error) {
        global.logger.error(`Error initializing subscription: ${error}`);
        throw error;
    }
}

/**
 * Processes a successful payment
 * @param paymentId ID of the payment
 * @param transactionId PayOS transaction ID
 * @returns True if processing was successful
 */
export async function processSuccessfulPayment(
    paymentId: string,
    transactionId: string
): Promise<boolean> {
    try {
        // Update payment status
        const payment = await paymentService().updatePaymentStatus(
            paymentId,
            'completed',
            transactionId
        );

        if (!payment) {
            throw new Error(`Payment not found: ${paymentId}`);
        }

        // Get package information
        const packageInfo = SUBSCRIPTION_PACKAGES[payment.packageType as PackageType];
        if (!packageInfo) {
            throw new Error(`Package not found: ${payment.packageType}`);
        }

        // Check if this is a new subscription or a renewal
        const existingSubscription = await subscriptionService().findActiveSubscription(payment.groupId);

        let subscription;
        if (existingSubscription) {
            // Extend existing subscription
            subscription = await subscriptionService().extendSubscription(
                payment.groupId,
                payment.userId,
                packageInfo.days
            );
        } else {
            // Create new subscription
            subscription = await subscriptionService().createSubscription(
                payment.groupId,
                payment.userId,
                packageInfo.days
            );
        }

        if (!subscription) {
            throw new Error(`Failed to create/extend subscription for group: ${payment.groupId}`);
        }

        // Get updated group info with new expiration date
        const group = await groupService().findGroupById(payment.groupId);
        if (!group) {
            throw new Error(`Group not found: ${payment.groupId}`);
        }

        // Send success notification
        await sendSuccessNotification(
            payment.groupId,
            payment.packageType as PackageType,
            transactionId,
            group.expiresAt || new Date()
        );

        global.logger.info(`Successfully processed payment for group ${payment.groupId} with package ${payment.packageType}`);
        return true;
    } catch (error) {
        global.logger.error(`Error processing payment: ${error}`);

        // Try to send error notification to the group
        try {
            // Retrieve payment info to get groupId for notification
            const paymentRecord = await paymentService().findById(paymentId);

            if (paymentRecord && paymentRecord.groupId) {
                await sendError(
                    `Đã xảy ra lỗi khi xử lý thanh toán. Vui lòng liên hệ ADMIN để được hỗ trợ.`,
                    paymentRecord.groupId,
                    true
                );
            }
        } catch (notifyError) {
            global.logger.error(`Unable to send error notification: ${notifyError}`);
        }

        return false;
    }
}

/**
 * Checks and deactivates expired groups
 */
export async function checkExpiredGroups(): Promise<void> {
    try {
        // Use subscription service to deactivate expired subscriptions
        const count = await subscriptionService().deactivateExpiredSubscriptions();

        if (count > 0) {
            global.logger.info(`Deactivated ${count} expired subscriptions`);
        } else {
            global.logger.info('No expired subscriptions found');
        }
    } catch (error) {
        global.logger.error(`Error checking expired groups: ${error}`);
    }
}

/**
 * Sends expiration reminders to groups
 * @param daysBeforeExpiration Days before expiration to send reminders
 */
export async function sendExpirationReminders(daysBeforeExpiration: number = 3): Promise<void> {
    try {
        // Get subscriptions expiring soon
        const expiringSubscriptions = await subscriptionService().getSubscriptionsExpiringSoon(daysBeforeExpiration);

        if (expiringSubscriptions.length === 0) {
            global.logger.info('No subscriptions expiring soon');
            return;
        }

        global.logger.info(`Found ${expiringSubscriptions.length} subscriptions expiring soon`);

        // Send reminder for each subscription
        for (const subscription of expiringSubscriptions) {
            if (global.bot) {
                const daysLeft = Math.ceil(
                    (subscription.endDate.getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                const message = `⏰ THÔNG BÁO SẮP HẾT HẠN\n\n` +
                    `Thời hạn sử dụng bot của nhóm sẽ hết hạn trong ${daysLeft} ngày (${subscription.endDate.toLocaleString('vi-VN')}).\n\n` +
                    `Để tiếp tục sử dụng dịch vụ, vui lòng gia hạn bằng lệnh:\n` +
                    `- Gõ /extend để xem các gói gia hạn\n` +
                    `- Gõ /extend [tên_gói] để gia hạn với gói cụ thể\n\n` +
                    `📢 Gia hạn ngay để không bị gián đoạn dịch vụ!`;

                await sendTextMessage(message, subscription.groupId, true);
                global.logger.info(`Sent expiration reminder to group: ${subscription.groupId}`);
            }
        }
    } catch (error) {
        global.logger.error(`Error sending expiration reminders: ${error}`);
    }
}

/**
 * Gets information about a package
 * @param packageType Package type
 * @returns Package information or null
 */
export function getPackageInfo(packageType: string): Package | null {
    if (!Object.keys(SUBSCRIPTION_PACKAGES).includes(packageType)) {
        return null;
    }

    return SUBSCRIPTION_PACKAGES[packageType as PackageType];
}

export default {
    initializeSubscription,
    processSuccessfulPayment,
    checkExpiredGroups,
    sendExpirationReminders,
    getPackageInfo
};