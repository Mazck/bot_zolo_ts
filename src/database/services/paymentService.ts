import { Payment } from '../entities';
import { DatabaseService } from '../index';
import { LessThan, MoreThan, Equal } from 'typeorm';
import global from '../../global';
import { PackageType } from '../../config';

/**
 * Payment service for database operations
 */
export class PaymentService extends DatabaseService<Payment> {
    constructor() {
        super(Payment);
    }

    /**
     * Creates a new payment record
     */
    async createPayment(
        userId: string,
        groupId: string,
        amount: number,
        packageType: PackageType,
        orderCode?: string,
        description?: string
    ): Promise<Payment | null> {
        try {
            const payment = this.getRepository().create({
                userId,
                groupId,
                amount,
                packageType,
                orderCode,
                description,
                status: 'pending'
            });

            return await this.getRepository().save(payment);
        } catch (error) {
            global.logger.error(`Error creating payment: ${error}`);
            return null;
        }
    }

    /**
     * Finds a payment by order code
     */
    async findPaymentByOrderCode(orderCode: string): Promise<Payment | null> {
        try {
            return await this.findOneBy({ orderCode });
        } catch (error) {
            global.logger.error(`Error finding payment by order code: ${error}`);
            return null;
        }
    }

    /**
     * Finds a payment by PayOS transaction ID
     */
    async findPaymentByTransactionId(transactionId: string): Promise<Payment | null> {
        try {
            return await this.findOneBy({ payosTransactionId: transactionId });
        } catch (error) {
            global.logger.error(`Error finding payment by transaction ID: ${error}`);
            return null;
        }
    }

    /**
     * Updates payment status
     */
    async updatePaymentStatus(
        paymentId: string,
        status: 'pending' | 'completed' | 'failed',
        transactionId?: string
    ): Promise<Payment | null> {
        try {
            const payment = await this.findById(paymentId);
            if (!payment) return null;

            payment.status = status;
            if (transactionId) {
                payment.payosTransactionId = transactionId;
            }

            return await this.getRepository().save(payment);
        } catch (error) {
            global.logger.error(`Error updating payment status: ${error}`);
            return null;
        }
    }

    /**
     * Gets payment history for a group
     */
    async getGroupPaymentHistory(
        groupId: string,
        limit?: number,
        offset?: number
    ): Promise<Payment[]> {
        try {
            return await this.getRepository().find({
                where: { groupId },
                order: { createdAt: 'DESC' },
                skip: offset,
                take: limit
            });
        } catch (error) {
            global.logger.error(`Error getting group payment history: ${error}`);
            return [];
        }
    }

    /**
     * Gets payment history for a user
     */
    async getUserPaymentHistory(
        userId: string,
        limit?: number,
        offset?: number
    ): Promise<Payment[]> {
        try {
            return await this.getRepository().find({
                where: { userId },
                order: { createdAt: 'DESC' },
                skip: offset,
                take: limit
            });
        } catch (error) {
            global.logger.error(`Error getting user payment history: ${error}`);
            return [];
        }
    }

    /**
     * Gets successful payments in a date range
     */
    async getSuccessfulPayments(
        startDate: Date,
        endDate: Date
    ): Promise<Payment[]> {
        try {
            return await this.getRepository().find({
                where: {
                    status: 'completed',
                    createdAt: MoreThan(startDate),
                    updatedAt: LessThan(endDate)
                },
                order: { createdAt: 'DESC' }
            });
        } catch (error) {
            global.logger.error(`Error getting successful payments: ${error}`);
            return [];
        }
    }

    /**
     * Gets total revenue from a specified date
     */
    async getTotalRevenue(fromDate?: Date): Promise<number> {
        try {
            const query = this.getRepository().createQueryBuilder('payment')
                .select('SUM(payment.amount)', 'total')
                .where('payment.status = :status', { status: 'completed' });

            if (fromDate) {
                query.andWhere('payment.createdAt >= :fromDate', { fromDate });
            }

            const result = await query.getRawOne();
            return result?.total || 0;
        } catch (error) {
            global.logger.error(`Error getting total revenue: ${error}`);
            return 0;
        }
    }

    /**
     * Gets revenue by package type
     */
    async getRevenueByPackage(): Promise<Record<string, number>> {
        try {
            const results = await this.getRepository().createQueryBuilder('payment')
                .select('payment.packageType', 'packageType')
                .addSelect('SUM(payment.amount)', 'total')
                .where('payment.status = :status', { status: 'completed' })
                .groupBy('payment.packageType')
                .getRawMany();

            const revenue: Record<string, number> = {};
            results.forEach(result => {
                revenue[result.packageType] = parseFloat(result.total) || 0;
            });

            return revenue;
        } catch (error) {
            global.logger.error(`Error getting revenue by package: ${error}`);
            return {};
        }
    }

    /**
     * Gets pending payments older than a specified time
     */
    async getPendingPayments(olderThanHours: number = 24): Promise<Payment[]> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

            return await this.getRepository().find({
                where: {
                    status: 'pending',
                    createdAt: LessThan(cutoffDate)
                }
            });
        } catch (error) {
            global.logger.error(`Error getting pending payments: ${error}`);
            return [];
        }
    }

    /**
     * Marks old pending payments as failed
     */
    async cancelExpiredPayments(olderThanHours: number = 24): Promise<number> {
        try {
            const pendingPayments = await this.getPendingPayments(olderThanHours);

            let cancelCount = 0;
            for (const payment of pendingPayments) {
                payment.status = 'failed';
                await this.getRepository().save(payment);
                cancelCount++;
            }

            return cancelCount;
        } catch (error) {
            global.logger.error(`Error canceling expired payments: ${error}`);
            return 0;
        }
    }
}

// Create and export a singleton instance
const paymentService = new PaymentService();
export default paymentService;