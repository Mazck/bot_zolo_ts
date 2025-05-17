import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from '../database';
import { paymentService, groupService } from '../database/services';
import global from '../global';
import { createLogger } from '../utils/logger';

// Tải biến môi trường
dotenv.config();

// Khởi tạo logger nếu cần
if (!global.logger) {
    global.logger = createLogger();
}

/**
 * Hiển thị thông tin chi tiết về thanh toán
 */
function displayPaymentDetails(payment: any, index?: number) {
    const prefix = index !== undefined ? `${index}. ` : '';
    console.log(`${prefix}===== THÔNG TIN THANH TOÁN =====`);
    console.log(`ID: ${payment.id}`);
    console.log(`Mã đơn hàng: ${payment.orderCode || 'N/A'}`);
    console.log(`Nhóm: ${payment.groupId}`);
    console.log(`Người dùng: ${payment.userId}`);
    console.log(`Số tiền: ${payment.amount.toLocaleString('vi-VN')} VND`);
    console.log(`Gói: ${payment.packageType}`);
    console.log(`Trạng thái: ${payment.status}`);
    console.log(`Mã giao dịch PayOS: ${payment.payosTransactionId || 'Chưa có'}`);
    console.log(`Ngày tạo: ${new Date(payment.createdAt).toLocaleString('vi-VN')}`);
    console.log(`Cập nhật lần cuối: ${new Date(payment.updatedAt).toLocaleString('vi-VN')}`);
    console.log(`Mô tả: ${payment.description || 'N/A'}`);
    console.log('--------------------------------------');
}

/**
 * Hiển thị thông tin nhóm liên quan đến thanh toán
 */
async function displayGroupInfo(groupId: string) {
    try {
        const group = await groupService().findGroupById(groupId);
        if (!group) {
            console.log(`❌ Không tìm thấy thông tin nhóm: ${groupId}`);
            return;
        }

        console.log('===== THÔNG TIN NHÓM =====');
        console.log(`Tên nhóm: ${group.name}`);
        console.log(`Trạng thái: ${group.isActive ? '✅ Đã kích hoạt' : '❌ Chưa kích hoạt'}`);
        if (group.expiresAt) {
            const now = new Date();
            const expiryDate = new Date(group.expiresAt);
            const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            console.log(`Ngày hết hạn: ${expiryDate.toLocaleString('vi-VN')}`);
            console.log(`Thời gian còn lại: ${daysLeft} ngày`);
        }
        console.log('--------------------------------------');
    } catch (error:any) {
        console.error(`Lỗi lấy thông tin nhóm: ${error.message}`);
    }
}

/**
 * Kiểm tra thanh toán tự động
 */
async function checkPayments(orderCode?: string) {
    try {
        console.log('===== KIỂM TRA THANH TOÁN =====');
        console.log(`Thời gian: ${new Date().toLocaleString('vi-VN')}`);

        // Kết nối database
        console.log('Kết nối đến cơ sở dữ liệu...');
        await initializeDatabase();

        if (orderCode) {
            // Tìm thanh toán theo orderCode
            console.log(`Tìm thanh toán với mã đơn hàng: ${orderCode}`);
            const payment = await paymentService().findPaymentByOrderCode(orderCode);

            if (!payment) {
                console.error(`❌ Không tìm thấy thanh toán với mã đơn hàng: ${orderCode}`);
                return;
            }

            // Hiển thị thông tin chi tiết
            displayPaymentDetails(payment);

            // Hiển thị thông tin nhóm
            await displayGroupInfo(payment.groupId);

            // Kiểm tra và đề xuất hành động
            if (payment.status === 'pending') {
                console.log('⚠️ Thanh toán này đang ở trạng thái PENDING.');
                console.log('👉 Bạn có thể xử lý nó bằng lệnh:');
                console.log(`npm run process-payment ${orderCode}`);
            } else if (payment.status === 'completed') {
                console.log('✅ Thanh toán này đã hoàn tất.');
                console.log('👉 Nếu chưa nhận được thông báo, bạn có thể gửi lại thông báo bằng lệnh:');
                console.log(`npm run resend-notification ${orderCode}`);
            } else {
                console.log(`⚠️ Thanh toán này có trạng thái: ${payment.status}`);
            }
        } else {
            // Lấy các thanh toán gần đây
            console.log('Lấy các thanh toán gần đây...');

            // Kiểm tra thanh toán đang xử lý (pending)
            const pendingPayments = await paymentService().findBy({ status: 'pending' });
            if (pendingPayments.length > 0) {
                console.log(`\n⚠️ Có ${pendingPayments.length} thanh toán đang chờ xử lý (PENDING):`);
                pendingPayments.forEach((payment, index) => {
                    console.log(`${index + 1}. OrderCode: ${payment.orderCode || 'N/A'} | Nhóm: ${payment.groupId} | Số tiền: ${payment.amount.toLocaleString('vi-VN')} VND | Ngày tạo: ${new Date(payment.createdAt).toLocaleString('vi-VN')}`);
                });

                console.log('\n👉 Để xử lý thanh toán đang chờ, sử dụng lệnh:');
                console.log('npm run process-payment ORDER_CODE');
            } else {
                console.log('✅ Không có thanh toán nào đang chờ xử lý.');
            }

            // Lấy 5 thanh toán thành công gần đây nhất
            const completedPayments = await paymentService().findBy({ status: 'completed' });
            if (completedPayments.length > 0) {
                const recentCompletedPayments = completedPayments.sort((a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                ).slice(0, 5);

                console.log(`\n✅ ${completedPayments.length} thanh toán đã hoàn tất. 5 thanh toán gần đây nhất:`);
                recentCompletedPayments.forEach((payment, index) => {
                    console.log(`${index + 1}. OrderCode: ${payment.orderCode || 'N/A'} | Nhóm: ${payment.groupId} | Số tiền: ${payment.amount.toLocaleString('vi-VN')} VND | Ngày hoàn tất: ${new Date(payment.updatedAt).toLocaleString('vi-VN')}`);
                });
            } else {
                console.log('❗ Chưa có thanh toán nào được hoàn tất.');
            }

            // Lấy các thanh toán lỗi (nếu có)
            const failedPayments = await paymentService().findBy({ status: 'failed' });
            if (failedPayments.length > 0) {
                console.log(`\n❌ Có ${failedPayments.length} thanh toán thất bại:`);
                failedPayments.forEach((payment, index) => {
                    console.log(`${index + 1}. OrderCode: ${payment.orderCode || 'N/A'} | Nhóm: ${payment.groupId} | Số tiền: ${payment.amount.toLocaleString('vi-VN')} VND | Ngày cập nhật: ${new Date(payment.updatedAt).toLocaleString('vi-VN')}`);
                });
            }

            // Hướng dẫn tùy chọn
            console.log('\n===== HƯỚNG DẪN =====');
            console.log('1. Để xem chi tiết một thanh toán:');
            console.log('   npm run check-payments ORDER_CODE');
            console.log('2. Để xử lý một thanh toán đang chờ:');
            console.log('   npm run process-payment ORDER_CODE');
            console.log('3. Để gửi lại thông báo cho thanh toán đã hoàn tất:');
            console.log('   npm run resend-notification ORDER_CODE');
        }
    } catch (error: any) {
        console.error(`Lỗi kiểm tra thanh toán: ${error.message}`);
        if (error.stack) console.error(error.stack);
    } finally {
        // Đóng kết nối
        if (global.db && global.db.isInitialized) {
            await closeDatabase();
        }
    }
}

// Chạy khi gọi trực tiếp
if (require.main === module) {
    const args = process.argv.slice(2);
    const orderCode = args[0]; // Có thể là undefined

    checkPayments(orderCode)
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Lỗi không mong đợi:', err);
            process.exit(1);
        });
}

export { checkPayments };