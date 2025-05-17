import { SUBSCRIPTION_PACKAGES, PackageType } from '../config';
import { paymentService, groupService, subscriptionService } from '../database/services';
import { createPaymentLink, generateOrderCode } from './payos';
import { sendTextMessage } from '../utils/messageHelper';
import { Package } from '../types';
import global from '../global';

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
            orderCode
        );

        if (!payment) {
            throw new Error('Failed to create payment record in database');
        }

        // Prepare payment description
        const isExtend = group.isActive;
        const actionText = isExtend ? "Extend bot" : "Rent bot";
        const description = `${packageInfo.days} days - Group: ${group.name}`;
        console.log(description);
        // Create payment link via PayOS
        const paymentLinkResponse = await createPaymentLink(
            packageInfo.price,
            orderCode,
            description
        );

        // Log payment creation
        global.logger.info(`Created payment: ${packageType}, Amount: ${packageInfo.price}, Order: ${orderCode}`);

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

        // Activate group subscription
        await subscriptionService().createSubscription(
            payment.groupId,
            payment.userId,
            packageInfo.days
        );

        // Get updated group with new expiration date
        const group = await groupService().findGroupById(payment.groupId);

        if (!group) {
            throw new Error(`Group not found: ${payment.groupId}`);
        }

        // Send notification
        if (global.bot) {
            const isExtended = group.activatedAt &&
                (new Date().getTime() - (group.activatedAt?.getTime() || 0) > 3600000);

            const actionText = isExtended ? "EXTENSION" : "ACTIVATION";

            const message = `🎉 ${actionText} SUCCESSFUL!\n\n` +
                `✅ The group has been ${isExtended ? "extended" : "activated"} with ${packageInfo.name}.\n` +
                `✅ Duration: ${packageInfo.days} days\n` +
                `✅ Expires: ${group.expiresAt?.toLocaleString('vi-VN')}\n\n` +
                `💰 Amount: ${packageInfo.price.toLocaleString('vi-VN')}đ\n` +
                `🧾 Transaction ID: ${transactionId}\n\n` +
                `Thank you for using our service!`;

            await sendTextMessage(message, payment.groupId, true);
        }

        global.logger.info(`Successfully activated group ${payment.groupId} with package ${payment.packageType}`);
        return true;
    } catch (error) {
        global.logger.error(`Error processing payment: ${error}`);
        return false;
    }
}

/**
 * Checks for and deactivates expired groups
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
        // Get subscriptions that will expire soon
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

                const message = `⏰ EXPIRATION NOTICE\n\n` +
                    `Your bot subscription will expire in ${daysLeft} days (${subscription.endDate.toLocaleString('vi-VN')}).\n\n` +
                    `To continue using our service, please extend your subscription using the commands:\n` +
                    `- Type /extend to see available packages\n` +
                    `- Type /extend [package_name] to extend with a specific package\n\n` +
                    `📢 Extend now to avoid service interruption!`;

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