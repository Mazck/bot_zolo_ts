const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Tải biến môi trường
dotenv.config();

// Đường dẫn cơ sở dữ liệu và thư mục sao lưu
const dbType = process.env.DB_TYPE || 'sqlite';
const dbName = process.env.DB_NAME || 'zca_bot.sqlite';
const dbPath = path.join(__dirname, '..', dbName);
const backupDir = path.join(__dirname, '..', 'backups');

// Tạo thư mục sao lưu nếu chưa tồn tại
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('Đã tạo thư mục backups');
}

// Tạo tên file sao lưu với timestamp
const timestamp = new Date().toISOString().replace(/[:\-T\.Z]/g, '');
const backupFileName = `${dbName}.${timestamp}.backup`;
const backupPath = path.join(backupDir, backupFileName);

// Sao lưu dữ liệu dựa trên loại CSDL
if (dbType === 'sqlite') {
    // Sao lưu SQLite bằng cách sao chép file
    try {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`Đã sao lưu thành công ${dbName} vào ${backupPath}`);
    } catch (error) {
        console.error('Lỗi sao lưu SQLite:', error);
        process.exit(1);
    }
} else if (dbType === 'mysql') {
    // Sao lưu MySQL bằng mysqldump
    const { exec } = require('child_process');
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '3306';
    const dbUser = process.env.DB_USERNAME || 'root';
    const dbPass = process.env.DB_PASSWORD || '';

    // Tạo lệnh mysqldump
    const mysqldumpCmd = `mysqldump -h${dbHost} -P${dbPort} -u${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} > ${backupPath}`;

    // Thực thi lệnh
    exec(mysqldumpCmd, (error, stdout, stderr) => {
        if (error) {
            console.error('Lỗi sao lưu MySQL:', error);
            process.exit(1);
        }

        console.log(`Đã sao lưu thành công ${dbName} vào ${backupPath}`);
    });
} else {
    console.error(`Không hỗ trợ loại cơ sở dữ liệu: ${dbType}`);
    process.exit(1);
}

// Dọn dẹp các bản sao lưu cũ (giữ lại 10 bản gần nhất)
try {
    const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.startsWith(dbName) && file.endsWith('.backup'))
        .sort()
        .reverse();

    // Xóa các bản sao lưu cũ
    if (backupFiles.length > 10) {
        for (let i = 10; i < backupFiles.length; i++) {
            const oldBackupPath = path.join(backupDir, backupFiles[i]);
            fs.unlinkSync(oldBackupPath);
            console.log(`Đã xóa bản sao lưu cũ: ${oldBackupPath}`);
        }
    }
} catch (error) {
    console.error('Lỗi dọn dẹp bản sao lưu cũ:', error);
}