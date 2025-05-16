# Hướng dẫn cài đặt và triển khai ZCA Bot

## 1. Thiết lập môi trường

### Yêu cầu hệ thống
- Node.js 16.x trở lên
- Cơ sở dữ liệu (SQLite hoặc MySQL)
- Cookie Zalo hợp lệ

### Cài đặt các công cụ cần thiết

```bash
# Cài đặt Node.js và npm (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt TypeScript và PM2 toàn cục
npm install -g typescript ts-node pm2
```

## 2. Tải mã nguồn và cài đặt

### Clone repository

```bash
git clone https://github.com/yourusername/zca-bot.git
cd zca-bot
```

### Cài đặt dependencies

```bash
npm install
```

### Cấu hình môi trường

```bash
# Sao chép file .env.example thành .env
cp .env.example .env

# Chỉnh sửa file .env với thông tin cấu hình phù hợp
nano .env
```

## 3. Thiết lập cookie và xác thực Zalo

### Lưu cookie Zalo

Có hai cách để cung cấp cookie Zalo cho bot:

1. **Thông qua biến môi trường**:
   - Thêm cookie JSON vào biến `BOT_COOKIE` trong file `.env`

2. **Thông qua file**:
   - Tạo file `cookie.json` ở thư mục gốc của dự án với nội dung cookie Zalo

### Kiểm tra cookie

```bash
# Chạy bot ở chế độ phát triển để kiểm tra cookie
npm run dev
```

## 4. Khởi tạo cơ sở dữ liệu

### SQLite (mặc định)

```bash
# Chạy migration để khởi tạo cơ sở dữ liệu
npm run migration:run
```

### MySQL

1. Tạo cơ sở dữ liệu:
```sql
CREATE DATABASE zca_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Cấu hình MySQL trong file `.env`:
```
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=yourpassword
DB_NAME=zca_bot
```

3. Chạy migration:
```bash
npm run migration:run
```

## 5. Build và khởi động

### Biên dịch TypeScript

```bash
npm run build
```

### Khởi động bằng Node.js

```bash
npm start
```

### Khởi động bằng PM2 (khuyến nghị cho môi trường sản xuất)

```bash
# Khởi động
pm2 start ecosystem.config.json

# Kiểm tra trạng thái
pm2 status

# Xem log
pm2 logs zca-bot

# Thiết lập khởi động cùng hệ thống
pm2 startup
pm2 save
```

## 6. Thiết lập Webhook URL

Để sử dụng tính năng thanh toán PayOS, bạn cần thiết lập một URL webhook có thể truy cập từ internet:

1. **Sử dụng tên miền riêng**:
   - Cấu hình DNS của tên miền để trỏ đến máy chủ của bạn
   - Thiết lập reverse proxy với Nginx hoặc Apache
   - Cấu hình SSL với Let's Encrypt

2. **Sử dụng dịch vụ tunneling** (cho phát triển):
   - Ngrok: `ngrok http 3000`
   - Cloudflare Tunnel

3. **Cập nhật URL webhook** trong file `.env`:
   ```
   WEBHOOK_URL="https://your-domain.com/webhook/payos"
   ```

## 7. Triển khai với Docker

### Sử dụng Docker Compose

```bash
# Khởi động các dịch vụ
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f zca-bot

# Dừng các dịch vụ
docker-compose down
```

## 8. Sao lưu và khôi phục dữ liệu

### Sao lưu tự động

Thiết lập cron job để sao lưu định kỳ:

```bash
# Thêm cron job (chạy lệnh crontab -e)
0 0 * * * cd /path/to/zca-bot && node scripts/backup.js
```

### Sao lưu thủ công

```bash
# Sao lưu
node scripts/backup.js

# Khôi phục từ bản sao lưu mới nhất
node scripts/restore.js

# Khôi phục từ bản sao lưu cụ thể
node scripts/restore.js zca_bot.sqlite.20250516123456.backup
```

## 9. Bảo trì

### Cập nhật mã nguồn

```bash
# Lấy mã nguồn mới nhất
git pull

# Cài đặt dependencies mới (nếu có)
npm install

# Build lại
npm run build

# Khởi động lại dịch vụ
pm2 restart zca-bot
```

### Kiểm tra log

```bash
# Xem logs trực tiếp
tail -f logs/combined.log

# Xem logs thông qua PM2
pm2 logs zca-bot
```

## 10. Xử lý sự cố

### Vấn đề kết nối Zalo

Nếu cookie hết hạn hoặc không hợp lệ:
1. Lấy cookie mới từ Zalo
2. Cập nhật trong file `.env` hoặc `cookie.json`
3. Khởi động lại bot

### Vấn đề cơ sở dữ liệu

Nếu có lỗi kết nối đến cơ sở dữ liệu:
1. Kiểm tra thông tin kết nối trong file `.env`
2. Đảm bảo dịch vụ cơ sở dữ liệu đang chạy
3. Kiểm tra quyền truy cập

### Vấn đề webhook

Nếu không nhận được callback từ PayOS:
1. Kiểm tra URL webhook có thể truy cập từ internet
2. Xác minh cấu hình webhook trong PayOS
3. Kiểm tra log để xem lỗi cụ thể