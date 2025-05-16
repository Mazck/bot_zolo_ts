FROM node:18-alpine

# Tạo thư mục ứng dụng
WORKDIR /app

# Cài đặt các dependencies cần thiết
RUN apk add --no-cache tzdata

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Sao chép mã nguồn
COPY . .

# Kiểm tra và tạo các thư mục cần thiết
RUN mkdir -p logs backups

# Build mã TypeScript
RUN npm run build

# Mở cổng để kết nối từ bên ngoài container
EXPOSE 3000

# Khởi động ứng dụng
CMD ["node", "dist/index.js"]