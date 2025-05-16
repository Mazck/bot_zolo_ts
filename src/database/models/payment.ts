import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PackageType } from '../../config';
import global from '../../global';

@Entity('payments')
export class PaymentEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @Column()
    @Index()
    groupId: string;

    @Column('float')
    amount: number;

    @Column({ nullable: true })
    @Index()
    payosTransactionId: string;

    @Column({ nullable: true })
    @Index()
    orderCode: string;

    @Column({
        type: 'varchar',
        default: PackageType.BASIC
    })
    packageType: string;

    @Column({
        type: 'varchar',
        default: 'pending'
    })
    status: string; // 'pending' | 'completed' | 'failed'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

/**
 * Tạo thanh toán mới
 * @param userId ID người dùng
 * @param groupId ID nhóm
 * @param amount Số tiền
 * @param packageType Loại gói
 * @param orderCode Mã đơn hàng (tùy chọn)
 * @returns Thông tin thanh toán đã tạo
 */
export async function createPayment(
    userId: string,
    groupId: string,
    amount: number,
    packageType: PackageType,
    orderCode?: string
): Promise<PaymentEntity | null> {
    try {
        if (!global.db) return null;

        const paymentRepository = global.db.getRepository(PaymentEntity);

        const payment = paymentRepository.create({
            userId,
            groupId,
            amount,
            packageType,
            orderCode,
            status: 'pending'
        });

        return await paymentRepository.save(payment);
    } catch (error) {
        global.logger.error(`Lỗi tạo thanh toán: ${error}`);
        return null;
    }
}

/**
 * Tìm thanh toán theo ID
 * @param paymentId ID thanh toán
 * @returns Thông tin thanh toán hoặc null
 */
export async function findPaymentById(paymentId: string): Promise<PaymentEntity | null> {
    try {
        if (!global.db) return null;

        const paymentRepository = global.db.getRepository(PaymentEntity);
        return await paymentRepository.findOne({ where: { id: paymentId } });
    } catch (error) {
        global.logger.error(`Lỗi tìm thanh toán theo ID: ${error}`);
        return null;
    }
}

/**
 * Tìm thanh toán theo mã đơn hàng
 * @param orderCode Mã đơn hàng
 * @returns Thông tin thanh toán hoặc null
 */
export async function findPaymentByOrderCode(orderCode: string): Promise<PaymentEntity | null> {
    try {
        if (!global.db) return null;

        const paymentRepository = global.db.getRepository(PaymentEntity);
        return await paymentRepository.findOne({ where: { orderCode } });
    } catch (error) {
        global.logger.error(`Lỗi tìm thanh toán theo mã đơn hàng: ${error}`);
        return null;
    }
}

/**
 * Cập nhật trạng thái thanh toán
 * @param paymentId ID thanh toán
 * @param status Trạng thái mới
 * @param payosTransactionId ID giao dịch PayOS (tùy chọn)
 * @returns Thông tin thanh toán đã cập nhật hoặc null
 */
export async function updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'completed' | 'failed',
    payosTransactionId?: string
): Promise<PaymentEntity | null> {
    try {
        if (!global.db) return null;

        const paymentRepository = global.db.getRepository(PaymentEntity);
        const payment = await paymentRepository.findOne({ where: { id: paymentId } });

        if (!payment) return null;

        payment.status = status;
        if (payosTransactionId) {
            payment.payosTransactionId = payosTransactionId;
        }

        return await paymentRepository.save(payment);
    } catch (error) {
        global.logger.error(`Lỗi cập nhật trạng thái thanh toán: ${error}`);
        return null;
    }
}

/**
 * Tìm thanh toán theo ID giao dịch PayOS
 * @param payosTransactionId ID giao dịch PayOS
 * @returns Thông tin thanh toán hoặc null
 */
export async function findPaymentByPayosTransactionId(
    payosTransactionId: string
): Promise<PaymentEntity | null> {
    try {
        if (!global.db) return null;

        const paymentRepository = global.db.getRepository(PaymentEntity);
        return await paymentRepository.findOne({
            where: { payosTransactionId }
        });
    } catch (error) {
        global.logger.error(`Lỗi tìm thanh toán theo ID giao dịch PayOS: ${error}`);
        return null;
    }
}

/**
 * Lấy lịch sử thanh toán của một nhóm
 * @param groupId ID nhóm
 * @param limit Giới hạn số lượng
 * @param offset Vị trí bắt đầu
 * @returns Danh sách thanh toán
 */
export async function getGroupPaymentHistory(
    groupId: string,
    limit?: number,
    offset?: number
): Promise<PaymentEntity[]> {
    try {
        if (!global.db) return [];

        const paymentRepository = global.db.getRepository(PaymentEntity);
        const options: any = {
            where: { groupId },
            order: { createdAt: 'DESC' }
        };

        if (limit) options.take = limit;
        if (offset) options.skip = offset;

        return await paymentRepository.find(options);
    } catch (error) {
        global.logger.error(`Lỗi lấy lịch sử thanh toán của nhóm: ${error}`);
        return [];
    }
}

/**
 * Lấy lịch sử thanh toán của một người dùng
 * @param userId ID người dùng
 * @param limit Giới hạn số lượng
 * @param offset Vị trí bắt đầu
 * @returns Danh sách thanh toán
 */
export async function getUserPaymentHistory(
    userId: string,
    limit?: number,
    offset?: number
): Promise<PaymentEntity[]> {
    try {
        if (!global.db) return [];

        const paymentRepository = global.db.getRepository(PaymentEntity);
        const options: any = {
            where: { userId },
            order: { createdAt: 'DESC' }
        };

        if (limit) options.take = limit;
        if (offset) options.skip = offset;

        return await paymentRepository.find(options);
    } catch (error) {
        global.logger.error(`Lỗi lấy lịch sử thanh toán của người dùng: ${error}`);
        return [];
    }
}

/**
 * Lấy tất cả thanh toán
 * @param limit Giới hạn số lượng
 * @param offset Vị trí bắt đầu
 * @returns Danh sách thanh toán
 */
export async function findAllPayments(limit?: number, offset?: number): Promise<PaymentEntity[]> {
    try {
        if (!global.db) return [];

        const paymentRepository = global.db.getRepository(PaymentEntity);
        const options: any = {
            order: { createdAt: 'DESC' }
        };

        if (limit) options.take = limit;
        if (offset) options.skip = offset;

        return await paymentRepository.find(options);
    } catch (error) {
        global.logger.error(`Lỗi lấy tất cả thanh toán: ${error}`);
        return [];
    }
}