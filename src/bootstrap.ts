import dotenv from 'dotenv';
import path from 'path';

// Tải biến môi trường từ tệp .env
dotenv.config({
    path: path.join(process.cwd(), '.env')
});

// Thiết lập múi giờ
process.env.TZ = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';

// Kiểm tra các biến môi trường bắt buộc
const requiredEnvVars: string[] = [
    // Thêm các biến môi trường bắt buộc ở đây
    // Ví dụ: 'WEATHER_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error(`Thiếu các biến môi trường bắt buộc: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}