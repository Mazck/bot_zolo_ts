import { DataSource } from 'typeorm';
import { createDataSource } from '../index';
import { entities } from '../entities';
import global from '../../global';
import { createLogger } from '../../utils/logger';
import path from 'path';
import fs from 'fs';

// Initialize logger if needed
if (!global.logger) {
    global.logger = createLogger();
}

/**
 * Run database migrations
 */
async function runMigrations(): Promise<void> {
    try {
        global.logger.info('Starting database migration...');

        // Create data source
        const dataSource = createDataSource();

        // Initialize connection
        await dataSource.initialize();
        global.logger.info('Database connection established');

        // Check if we need to create a backup
        if (dataSource.options.type === 'sqlite') {
            const dbPath = dataSource.options.database as string;
            if (fs.existsSync(dbPath)) {
                await createBackup(dbPath);
            }
        }

        // Run synchronization (for development environments)
        if (dataSource.options.synchronize) {
            global.logger.info('Synchronizing database schema...');
            await dataSource.synchronize();
            global.logger.info('Database schema synchronized successfully');
        } else {
            global.logger.info('Schema synchronization is disabled. Using migrations instead.');

            // For a more controlled approach, you would define and run migrations here
            // This example focuses on the default synchronize approach

            // Example of running migrations:
            // global.logger.info('Running migrations...');
            // await dataSource.runMigrations();
            // global.logger.info('Migrations completed successfully');
        }

        // Close connection
        await dataSource.destroy();
        global.logger.info('Database connection closed');

        global.logger.info('Migration completed successfully');
    } catch (error) {
        global.logger.error(`Migration failed: ${error}`);
        process.exit(1);
    }
}

/**
 * Create a backup of the database file (SQLite only)
 */
async function createBackup(dbPath: string): Promise<void> {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(path.dirname(dbPath), 'backups');

        // Ensure backup directory exists
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupPath = path.join(backupDir, `${path.basename(dbPath)}.${timestamp}.bak`);

        // Copy the database file
        fs.copyFileSync(dbPath, backupPath);
        global.logger.info(`Created database backup at: ${backupPath}`);
    } catch (error) {
        global.logger.error(`Failed to create database backup: ${error}`);
        // Continue with migration even if backup fails
    }
}

/**
 * Run data seeds if the database is empty
 */
async function seedData(dataSource: DataSource): Promise<void> {
    try {
        global.logger.info('Checking if database needs seeding...');

        // Check if users table is empty
        const userCount = await dataSource.getRepository('User').count();

        if (userCount === 0) {
            global.logger.info('Database is empty. Running seed operations...');

            // Add your seeding logic here if needed
            // For example, create default admin users, etc.

            global.logger.info('Database seeding completed');
        } else {
            global.logger.info('Database already has data. Skipping seed operations.');
        }
    } catch (error) {
        global.logger.error(`Data seeding failed: ${error}`);
        // Continue with migration even if seeding fails
    }
}

// Run migrations when this script is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            global.logger.error(`Uncaught error: ${error}`);
            process.exit(1);
        });
}

// Export for programmatic use
export { runMigrations };