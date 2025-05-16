# ZCA Bot TypeScript - Project Documentation

## Giới thiệu

ZCA Bot là một bot Zalo toàn diện được phát triển bằng TypeScript và thư viện ZCA-JS. Bot được thiết kế với hệ thống quản lý nhóm, thanh toán tự động và phân quyền người dùng, cho phép vận hành thương mại hóa bot với nhiều nhóm cùng lúc.

## Tính năng nổi bật

- **Hệ thống đăng nhập**: Đăng nhập Zalo bằng cookie, hỗ trợ IMEI và UserAgent
- **Phân quyền ba cấp**: User, Manager, Admin với quyền hạn khác nhau
- **Kích hoạt nhóm**: Chỉ nhóm đã thanh toán mới sử dụng được các tính năng bot
- **Thanh toán PayOS**: Tự động tạo link và xử lý thanh toán, kích hoạt nhóm
- **Chống spam lệnh**: Giới hạn tần suất sử dụng lệnh để tránh lạm dụng
- **API nội bộ**: Cung cấp API để tích hợp với các hệ thống khác
- **Đa dạng gói dịch vụ**: Hỗ trợ nhiều gói dịch vụ với thời hạn khác nhau

## Yêu cầu hệ thống

- Node.js 16+ 
- TypeScript 4.5+
- SQLite/MySQL
- Tài khoản Zalo có cookie hợp lệ
- Tài khoản PayOS (cho tính năng thanh toán)

## Cài đặt

1. **Clone repository**:
```bash
git clone https://github.com/yourusername/zca-bot.git
cd zca-bot
```

2. **Cài đặt dependencies**:
```bash
npm install
```

3. **Cấu hình môi trường**:
```bash
cp .env.example .env
# Sửa file .env với thông tin cấu hình phù hợp
```

4. **Khởi tạo cơ sở dữ liệu**:
```bash
npm run migration:run
```

5. **Build và chạy**:
```bash
npm run build
npm start
```

## Cấu trúc dự án

```
src/
├── auth/                  # Xác thực và đăng nhập
├── commands/              # Các lệnh của bot
├── database/              # Cơ sở dữ liệu và models
├── events/                # Xử lý sự kiện Zalo
├── middlewares/           # Middleware lệnh và kiểm tra
├── services/              # Dịch vụ thanh toán, quản lý thuê
├── utils/                 # Tiện ích hỗ trợ
├── webserver/             # Máy chủ API và webhook
├── config.ts              # Cấu hình ứng dụng
├── global.ts              # Biến toàn cục
├── types.ts               # Định nghĩa kiểu dữ liệu
└── index.ts               # Entry point
```

## Các lệnh có sẵn

- `/help [lệnh]`: Hiển thị trợ giúp và hướng dẫn sử dụng
- `/rent [gói]`: Thuê bot cho nhóm
- `/extend [gói]`: Gia hạn thuê bot
- `/status`: Kiểm tra trạng thái thuê bot
- `/groupinfo`: Hiển thị thông tin chi tiết về nhóm

## Hệ thống phân quyền

Bot có 3 cấp độ quyền:

1. **User** (Người dùng thường):
   - Sử dụng lệnh cơ bản trong nhóm đã kích hoạt
   - Xem trạng thái thuê và thông tin nhóm

2. **Manager** (Quản trị viên nhóm):
   - Tất cả quyền của User
   - Thuê và gia hạn bot cho nhóm
   - Quản lý cài đặt nhóm

3. **Admin** (Quản trị viên bot):
   - Tất cả quyền của Manager
   - Quản lý toàn bộ bot
   - Truy cập API quản trị

## Hệ thống thanh toán

Bot tích hợp với PayOS để xử lý thanh toán:

1. **Tạo giao dịch**: Khi người dùng sử dụng lệnh `/rent` hoặc `/extend`
2. **Xử lý webhook**: Tự động cập nhật trạng thái và kích hoạt nhóm khi thanh toán thành công
3. **Quản lý hết hạn**: Tự động kiểm tra và vô hiệu hóa nhóm hết hạn

## Tính năng chống spam

Bot có hệ thống chống spam lệnh để tránh lạm dụng:

- Giới hạn số lượng lệnh trong khoảng thời gian nhất định
- Thời gian cooldown khi phát hiện spam
- Loại trừ một số lệnh không cần kiểm tra spam (như `/help`)

## API nội bộ

Bot cung cấp API để tích hợp với các hệ thống khác:

- `/api/bot/info`: Thông tin bot
- `/api/groups`: Danh sách nhóm
- `/api/users`: Danh sách người dùng
- `/api/payments`: Danh sách thanh toán
- `/api/stats`: Thống kê hệ thống

## Mở rộng và tùy biến

### Thêm lệnh mới

1. Tạo file lệnh mới trong `src/commands/`:
```typescript
const newCommand = {
  name: 'mycmd',
  aliases: ['mc', 'mycommand'],
  description: 'Mô tả lệnh mới',
  usage: '/mycmd [tham_số]',
  requiredPermission: 'user',
  
  execute: async (params) => {
    // Xử lý lệnh
  }
};

export default newCommand;
```

2. Đăng ký lệnh trong `src/commands/index.ts`

### Tùy chỉnh gói dịch vụ

Sửa đổi cấu hình gói trong `.env` hoặc `src/config.ts`:
```
PACKAGES='{
  "basic": {"name": "Gói Cơ bản", "price": 99000, "days": 30, "description": "Dịch vụ bot cơ bản trong 30 ngày"},
  "premium": {"name": "Gói Premium", "price": 249000, "days": 90, "description": "Dịch vụ bot đầy đủ trong 90 ngày"},
  "vip": {"name": "Gói VIP", "price": 899000, "days": 365, "description": "Dịch vụ bot VIP trong 365 ngày"}
}'
```

## Triển khai và vận hành

### Triển khai sản xuất

1. Cấu hình PM2 để quản lý process:
```bash
npm install -g pm2
pm2 start dist/index.js --name zca-bot
```

2. Thiết lập Webhook URL với domain có SSL:
```
WEBHOOK_URL="https://your-domain.com/webhook/payos"
```

3. Cấu hình Nginx làm reverse proxy (nếu cần)

### Bảo trì và sao lưu

1. Sao lưu cơ sở dữ liệu định kỳ:
```bash
# Với SQLite
cp zca_bot.sqlite zca_bot.sqlite.backup
```

2. Kiểm tra log:
```bash
tail -f logs/combined.log
```

## Vấn đề thường gặp

1. **Lỗi kết nối Zalo**: Kiểm tra lại cookie, IMEI và UserAgent
2. **Webhook không hoạt động**: Đảm bảo URL webhook có thể truy cập từ internet và có SSL
3. **Lỗi cơ sở dữ liệu**: Kiểm tra quyền truy cập và kết nối đến cơ sở dữ liệu

## Liên hệ và hỗ trợ

- Email: youremail@example.com
- Github: github.com/yourusername/zca-bot
- Zalo: zalo.me/yourzaloid