/**
 * File: scripts/restore.js
 * Mô tả: Script khôi phục dữ liệu từ bản sao lưu
 * 
 * Sử dụng: node scripts/restore.js [tên_file_sao_lưu]
 * Nếu không chỉ định tên file, sẽ khôi phục bản sao lưu mới nhất
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Tải biến môi trường
dotenv.config();

// Đường dẫn cơ sở dữ liệu và thư mục sao lưu
const dbType = process.env.DB_TYPE || 'sqlite';
const dbName = process.env.DB_NAME || 'zca_bot.sqlite';
const dbPath = path.join(__dirname, '..', dbName);
const backupDir = path.join(__dirname, '..', 'backups');

// Kiểm tra thư mục sao lưu tồn tại
if (!fs.existsSync(backupDir)) {
    console.error('Thư mục sao lưu không tồn tại');
    process.exit(1);
}

// Xác định file sao lưu
let backupFile;

// Nếu có tham số dòng lệnh, sử dụng nó làm tên file sao lưu
if (process.argv.length > 2) {
    backupFile = process.argv[2];

    // Kiểm tra nếu chỉ cung cấp tên file mà không có đường dẫn
    if (!backupFile.includes('/') && !backupFile.includes('\\')) {
        backupFile = path.join(backupDir, backupFile);
    }

    // Kiểm tra file sao lưu tồn tại
    if (!fs.existsSync(backupFile)) {
        console.error(`File sao lưu không tồn tại: ${backupFile}`);
        process.exit(1);
    }
} else {
    // Tìm bản sao lưu mới nhất
    const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.startsWith(dbName) && file.endsWith('.backup'))
        .sort()
        .reverse();

    if (backupFiles.length === 0) {
        console.error('Không tìm thấy bản sao lưu nào');
        process.exit(1);
    }

    backupFile = path.join(backupDir, backupFiles[0]);
    console.log(`Sử dụng bản sao lưu mới nhất: ${backupFiles[0]}`);
}

// Tạo interface đọc dòng lệnh
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Xác nhận trước khi khôi phục
rl.question(`Bạn có chắc muốn khôi phục từ "${path.basename(backupFile)}"? Dữ liệu hiện tại sẽ bị mất. (y/N): `, async (answer) => {
    if (answer.toLowerCase() !== 'y') {
        console.log('Đã hủy khôi phục');
        rl.close();
        return;
    }

    // Khôi phục dữ liệu dựa trên loại CSDL
    if (dbType === 'sqlite') {
        // Sao lưu dữ liệu hiện tại trước khi khôi phục
        try {
            const timestamp = new Date().toISOString().replace(/[:\-T\.Z]/g, '');
            const backupBeforeRestorePath = path.join(backupDir, `${dbName}.before_restore.${timestamp}.backup`);

            if (fs.existsSync(dbPath)) {
                fs.copyFileSync(dbPath, backupBeforeRestorePath);
                console.log(`Đã sao lưu dữ liệu hiện tại vào ${backupBeforeRestorePath}`);
            }

            // Khôi phục từ bản sao lưu
            fs.copyFileSync(backupFile, dbPath);
            console.log(`Đã khôi phục thành công từ ${backupFile}`);
        } catch (error) {
            console.error('Lỗi khôi phục SQLite:', error);
        }
    } else if (dbType === 'mysql') {
        // Khôi phục MySQL bằng mysql client
        const { exec } = require('child_process');
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '3306';
        const dbUser = process.env.DB_USERNAME || 'root';
        const dbPass = process.env.DB_PASSWORD || '';

        // Tạo lệnh mysql
        const mysqlCmd = `mysql -h${dbHost} -P${dbPort} -u${dbUser} ${dbPass ? `-p${dbPass}` : ''} ${dbName} < ${backupFile}`;

        // Thực thi lệnh
        exec(mysqlCmd, (error, stdout, stderr) => {
            if (error) {
                console.error('Lỗi khôi phục MySQL:', error);
                rl.close();
                return;
            }

            console.log(`Đã khôi phục thành công từ ${backupFile}`);
            rl.close();
        });
    } else {
        console.error(`Không hỗ trợ loại cơ sở dữ liệu: ${dbType}`);
        rl.close();
    }

    rl.close();
});