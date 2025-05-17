/**
 * Initialize database tables manually
 * 
 * This script creates database tables explicitly for SQLite compatibility
 */

import { DataSource } from 'typeorm';
import { createLogger } from '../../utils/logger';
import path from 'path';
import fs from 'fs';
import { DB_CONFIG } from '../../config';
import global from '../../global';

// Initialize logger if needed
if (!global.logger) {
    global.logger = createLogger();
}

// Create data source
const dataSource = new DataSource({
    type: 'sqlite',
    database: path.resolve(process.cwd(), DB_CONFIG.database || 'zca_bot.sqlite'),
    synchronize: false, // Don't auto-sync schema
    logging: DB_CONFIG.logging
});

/**
 * Run manual table creation
 */
async function createTables(): Promise<void> {
    try {
        global.logger.info('Starting manual table creation...');

        // Initialize connection
        await dataSource.initialize();
        global.logger.info('Database connection established');

        // Define schemas using raw SQL for SQLite compatibility
        const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY,
    "username" TEXT,
    "displayName" TEXT,
    "zaloName" TEXT,
    "avatar" TEXT,
    "exp" INTEGER DEFAULT 0,
    "level" INTEGER DEFAULT 1,
    "money" INTEGER DEFAULT 0,
    "messageCount" INTEGER DEFAULT 0,
    "banned" BOOLEAN DEFAULT FALSE,
    "banReason" TEXT,
    "banTime" DATETIME,
    "lastActive" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "phoneNumber" TEXT,
    "gender" INTEGER,
    "data" TEXT DEFAULT '{}',
    "permission" TEXT DEFAULT 'user',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS "groups" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "exp" INTEGER DEFAULT 0,
    "level" INTEGER DEFAULT 1,
    "messageCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT FALSE,
    "activatedAt" DATETIME,
    "expiresAt" DATETIME,
    "creatorId" TEXT,
    "adminIdsJson" TEXT DEFAULT '[]',
    "settingsJson" TEXT DEFAULT '{}',
    "banned" BOOLEAN DEFAULT FALSE,
    "banReason" TEXT,
    "dataJson" TEXT DEFAULT '{}',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GroupUsers table
CREATE TABLE IF NOT EXISTS "group_users" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "exp" INTEGER DEFAULT 0,
    "messageCount" INTEGER DEFAULT 0,
    "role" TEXT DEFAULT 'member',
    "joinedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "isMuted" BOOLEAN DEFAULT FALSE,
    "dataJson" TEXT DEFAULT '{}',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "groupId"),
    FOREIGN KEY("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
);

-- LicenseKeys table
CREATE TABLE IF NOT EXISTS "license_keys" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL UNIQUE,
    "duration" INTEGER NOT NULL,
    "durationType" TEXT NOT NULL,
    "isUsed" BOOLEAN DEFAULT FALSE,
    "createdBy" TEXT,
    "usedBy" TEXT,
    "usedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY("createdBy") REFERENCES "users"("id") ON DELETE SET NULL,
    FOREIGN KEY("usedBy") REFERENCES "users"("id") ON DELETE SET NULL
);

-- Payments table
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payosTransactionId" TEXT,
    "orderCode" TEXT,
    "packageType" TEXT DEFAULT 'basic',
    "status" TEXT DEFAULT 'pending',
    "description" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
);

-- GroupSubscriptions table
CREATE TABLE IF NOT EXISTS "group_subscriptions" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "groupId" TEXT NOT NULL,
    "activatedBy" TEXT NOT NULL,
    "startDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "keysUsedJson" TEXT DEFAULT '[]',
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY("groupId") REFERENCES "groups"("id") ON DELETE CASCADE,
    FOREIGN KEY("activatedBy") REFERENCES "users"("id") ON DELETE CASCADE
);

-- CommandUsage table
CREATE TABLE IF NOT EXISTS "command_usage" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "commandName" TEXT NOT NULL,
    "usedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS "idx_users_banned" ON "users" ("banned");
CREATE INDEX IF NOT EXISTS "idx_users_lastActive" ON "users" ("lastActive");
CREATE INDEX IF NOT EXISTS "idx_groups_isActive" ON "groups" ("isActive");
CREATE INDEX IF NOT EXISTS "idx_groups_expiresAt" ON "groups" ("expiresAt");
CREATE INDEX IF NOT EXISTS "idx_groups_banned" ON "groups" ("banned");
CREATE INDEX IF NOT EXISTS "idx_group_users_userId" ON "group_users" ("userId");
CREATE INDEX IF NOT EXISTS "idx_group_users_groupId" ON "group_users" ("groupId");
CREATE INDEX IF NOT EXISTS "idx_license_keys_key" ON "license_keys" ("key");
CREATE INDEX IF NOT EXISTS "idx_license_keys_isUsed" ON "license_keys" ("isUsed");
CREATE INDEX IF NOT EXISTS "idx_payments_userId" ON "payments" ("userId");
CREATE INDEX IF NOT EXISTS "idx_payments_groupId" ON "payments" ("groupId");
CREATE INDEX IF NOT EXISTS "idx_payments_payosTransactionId" ON "payments" ("payosTransactionId");
CREATE INDEX IF NOT EXISTS "idx_payments_orderCode" ON "payments" ("orderCode");
CREATE INDEX IF NOT EXISTS "idx_group_subscriptions_groupId" ON "group_subscriptions" ("groupId");
CREATE INDEX IF NOT EXISTS "idx_group_subscriptions_endDate" ON "group_subscriptions" ("endDate");
CREATE INDEX IF NOT EXISTS "idx_command_usage_userId" ON "command_usage" ("userId");
CREATE INDEX IF NOT EXISTS "idx_command_usage_usedAt" ON "command_usage" ("usedAt");
        `;

        // Execute the SQL
        await dataSource.query(createTablesSQL);

        global.logger.info('Tables created successfully');

        // Close connection
        await dataSource.destroy();
        global.logger.info('Database connection closed');

        global.logger.info('Manual table creation completed successfully');
    } catch (error) {
        global.logger.error(`Error creating tables: ${error}`);
        process.exit(1);
    }
}

// Run table creation when this script is executed directly
if (require.main === module) {
    createTables()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            global.logger.error(`Uncaught error: ${error}`);
            process.exit(1);
        });
}

// Export for programmatic use
export { createTables };