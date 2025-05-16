import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Package } from './types';

// Tải biến môi trường
dotenv.config();

// Enum quyền người dùng
export enum UserPermission {
    USER = 'user',       // Người dùng thông thường
    MANAGER = 'manager', // Quản trị viên nhóm
    ADMIN = 'admin'      // Quản trị viên bot
}

// Enum loại gói
export enum PackageType {
    BASIC = 'basic',     // Gói cơ bản
    PREMIUM = 'premium', // Gói cao cấp
    VIP = 'vip'          // Gói VIP
}

// Cấu hình bot
export const BOT_CONFIG = {
    cookie: process.env.BOT_COOKIE || '',
    prefix: process.env.BOT_PREFIX || '/',
    botName: process.env.BOT_NAME || 'ZCA Bot',
    imei: process.env.BOT_IMEI || '',
    userAgent: process.env.BOT_USER_AGENT || '',
    cookiePath: process.env.BOT_COOKIE_PATH || path.join(process.cwd(), 'cookie.json'),

    // Remove or rename these properties if they're not supported by zca-js
    // Instead of saveCredentials, use something like:
    shouldSaveCredentials: process.env.BOT_SAVE_CREDENTIALS !== 'false',
    // Instead of credentialsPath, use something like:
    credentialsSavePath: process.env.BOT_CREDENTIALS_PATH || path.join(process.cwd(), 'credentials.json'),

    // Các tùy chọn nâng cao
    selfListen: process.env.BOT_SELF_LISTEN === 'true' || false,
    checkUpdate: process.env.BOT_CHECK_UPDATE !== 'false',
    autoReconnect: process.env.BOT_AUTO_RECONNECT !== 'false',
    logging: process.env.BOT_LOGGING !== 'false'
};

// Cấu hình cơ sở dữ liệu
export const DB_CONFIG = {
    type: process.env.DB_TYPE || 'sqlite',
    database: process.env.DB_NAME || 'zca_bot.sqlite',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
    logging: process.env.LOG_LEVEL === 'debug'
};

// Cấu hình PayOS
export const PAYOS_CONFIG = {
    clientId: process.env.PAYOS_CLIENT_ID || '',
    apiKey: process.env.PAYOS_API_KEY || '',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
    webhookSecret: process.env.PAYOS_WEBHOOK_SECRET || '',
    webhookUrl: process.env.WEBHOOK_URL || '',

    // Tùy chọn nâng cao
    cancelUrl: process.env.PAYOS_CANCEL_URL || '',
    returnUrl: process.env.PAYOS_RETURN_URL || '',
    expiryTime: parseInt(process.env.PAYOS_EXPIRY_TIME || '24') // Giờ
};

// Cấu hình server
export const SERVER_CONFIG = {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    apiKey: process.env.API_KEY || generateApiKey(),
    trustProxy: process.env.TRUST_PROXY === 'true' || false
};

// Danh sách ID admin
export const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').filter(id => id.trim() !== '');

// Tạo API key nếu không có
function generateApiKey(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

// Định nghĩa các gói đăng ký mặc định
let packages: Record<string, Package> = {
    basic: {
        name: 'Gói Cơ bản',
        price: 99000,
        days: 30,
        description: 'Dịch vụ bot cơ bản trong 30 ngày'
    },
    premium: {
        name: 'Gói Premium',
        price: 249000,
        days: 90,
        description: 'Dịch vụ bot đầy đủ trong 90 ngày'
    },
    vip: {
        name: 'Gói VIP',
        price: 899000,
        days: 365,
        description: 'Dịch vụ bot VIP trong 365 ngày'
    }
};

// Tải gói từ biến môi trường nếu có
if (process.env.PACKAGES) {
    try {
        packages = JSON.parse(process.env.PACKAGES);
    } catch (error) {
        console.error('Định dạng PACKAGES không hợp lệ:', error);
    }
}

export const SUBSCRIPTION_PACKAGES = packages;

// Chống spam
export const ANTI_SPAM_CONFIG = {
    maxCommands: parseInt(process.env.ANTI_SPAM_MAX_COMMANDS || '5'),
    timeWindow: parseInt(process.env.ANTI_SPAM_TIME_WINDOW || '10') * 1000, // milliseconds
    cooldownTime: parseInt(process.env.ANTI_SPAM_COOLDOWN || '60') * 1000, // milliseconds
    excludedCommands: (process.env.ANTI_SPAM_EXCLUDED_COMMANDS || 'help,status').split(',')
};