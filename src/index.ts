import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { initializeDatabase, closeDatabase } from './database';
import { loginWithCookie } from './auth/login';
import { setupEventListeners } from './events/handler';
import { registerCommands } from './commands';
import { setupWebServer } from './webserver';
import { userService, groupService, commandTrackingService, subscriptionService } from './database/services';
import global from './global';

// Load environment variables before doing anything else
dotenv.config();

// Ensure required directories exist
ensureDirectoriesExist();

/**
 * Initialize the bot with Zalo credentials
 */
async function initializeBot() {
    try {
        // Login with cookie
        const api = await loginWithCookie();
        global.logger.info(`Bot successfully started with ID: ${api.id}`);
        return api;
    } catch (error) {
        throw new Error(`Bot initialization failed: ${error}`);
    }
}

/**
 * Ensure required directories exist
 */
function ensureDirectoriesExist() {
    const dirs = [
        'logs',
        'backups'
    ];

    for (const dir of dirs) {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            global.logger.info(`Created directory: ${dir}`);
        }
    }
}

/**
 * Setup recurring tasks
 */
function setupCronTasks() {
    // Check for expired groups hourly
    cron.schedule('0 * * * *', async () => {
        global.logger.info('Running expired groups check...');
        try {
            // Use the service function call pattern
            await subscriptionService().deactivateExpiredSubscriptions();
        } catch (error) {
            global.logger.error(`Error checking expired groups: ${error}`);
        }
    });

    // Send renewal reminders daily at 8 AM
    cron.schedule('0 8 * * *', async () => {
        global.logger.info('Sending renewal reminders...');
        try {
            const expiringSubscriptions = await subscriptionService().getSubscriptionsExpiringSoon(3);

            // Process each expiring subscription
            for (const subscription of expiringSubscriptions) {
                // Implementation to send reminders
                global.logger.info(`Reminder sent for group: ${subscription.groupId}`);
            }
        } catch (error) {
            global.logger.error(`Error sending renewal reminders: ${error}`);
        }
    });

    // Clean up old command usage data every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        global.logger.info('Cleaning up old command usage data...');
        try {
            // Note the () to call the function first
            await commandTrackingService().cleanupOldCommandUsage(24 * 60 * 60 * 1000); // Delete data older than 24 hours
        } catch (error) {
            global.logger.error(`Error cleaning up old command data: ${error}`);
        }
    });

    // Backup database daily at midnight
    cron.schedule('0 0 * * *', () => {
        global.logger.info('Backing up database...');
        try {
            const { exec } = require('child_process');
            exec('node scripts/backup.js', (error: Error | null, _stdout: string, _stderr: string) => {
                if (error) {
                    global.logger.error(`Database backup error: ${error}`);
                    return;
                }
                global.logger.info('Database backup successful');
            });
        } catch (error) {
            global.logger.error(`Database backup error: ${error}`);
        }
    });

    global.logger.info('Scheduled tasks setup complete');
}

/**
 * Setup shutdown handler
 */
function setupShutdownHandler() {
    // Handle application shutdown
    process.on('SIGINT', async () => {
        global.logger.info('Application shutting down...');
        try {
            // Close database connection if open
            await closeDatabase();

            // Other cleanup tasks if needed
            global.logger.info('Application shutdown complete');
        } catch (error) {
            global.logger.error(`Error during shutdown: ${error}`);
        }
        process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
        global.logger.error(`Uncaught exception: ${error.stack}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
        global.logger.error(`Unhandled promise rejection: ${reason}`);
    });
}

/**
 * Application startup function
 */
async function startApplication() {
    try {
        const startTime = Date.now();
        global.logger.info('Starting application...');

        // Initialize database connection
        global.logger.info('Connecting to database...');
        await initializeDatabase();
        global.logger.info('Database connection successful');

        // Initialize bot
        global.logger.info('Initializing bot...');
        global.bot = await initializeBot();
        global.logger.info(`Bot initialized with ID: ${global.bot.id}`);

        // Register commands
        global.logger.info('Registering commands...');
        const commandCount = registerCommands();
        global.logger.info(`Registered ${commandCount} commands`);

        // Setup event listeners
        global.logger.info('Setting up event listeners...');
        setupEventListeners();

        // Setup scheduled tasks
        global.logger.info('Setting up scheduled tasks...');
        setupCronTasks();

        // Setup webhook server
        global.logger.info('Starting webhook server...');
        await setupWebServer();

        // Setup shutdown handler
        setupShutdownHandler();

        const bootTime = ((Date.now() - startTime) / 1000).toFixed(2);
        global.logger.info(`Application started successfully in ${bootTime}s`);

        // Display logo and version info
        displayLogo();

    } catch (error) {
        global.logger.error(`Application startup error: ${error}`);
        process.exit(1);
    }
}

/**
 * Display logo and version info
 */
function displayLogo() {
    // Read version info from package.json
    const packageJson = require('../package.json');

    console.log(`
  ███████╗ ██████╗ █████╗     ██████╗  ██████╗ ████████╗
  ╚══███╔╝██╔════╝██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
    ███╔╝ ██║     ███████║    ██████╔╝██║   ██║   ██║   
   ███╔╝  ██║     ██╔══██║    ██╔══██╗██║   ██║   ██║   
  ███████╗╚██████╗██║  ██║    ██████╔╝╚██████╔╝   ██║   
  ╚══════╝ ╚═════╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝   
  
  ZCA Bot v${packageJson.version} - Comprehensive Zalo Bot
  Node.js: ${process.version}
  Time: ${new Date().toLocaleString('vi-VN')}
  `);
}

// Start the application
startApplication();