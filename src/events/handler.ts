/**
 * Event handler setup
 * 
 * This file sets up all event listeners for the bot
 */

import { setupMessageListener } from './messageHandler';
import { setupGroupEventListener } from './groupHandler';
import { setupReactionListener } from './reactionHandler';
import { commandTrackingService } from '../database/services';
import global from '../global';

/**
 * Sets up all event listeners
 */
export function setupEventListeners() {
    if (!global.bot) {
        global.logger.error('Bot not initialized, cannot set up event listeners');
        return;
    }

    try {
        // Start listening for events
        global.bot.listener.start();
        global.logger.info('Zalo event listener started');

        // Set up specific event handlers
        setupMessageListener();
        setupGroupEventListener();
        setupReactionListener();

        // Set up data cleanup task
        setupCleanupTask();

        global.logger.info('All event listeners setup complete');
    } catch (error) {
        global.logger.error(`Error setting up event listeners: ${error}`);
    }
}

/**
 * Sets up periodic data cleanup task
 */
function setupCleanupTask() {
    // Clean up every 6 hours
    setInterval(async () => {
        try {
            // Delete command usage data older than 24 hours
            // Note the () to call the function first
            await commandTrackingService().cleanupOldCommandUsage(24 * 60 * 60 * 1000);
        } catch (error) {
            global.logger.error(`Error cleaning up old data: ${error}`);
        }
    }, 6 * 60 * 60 * 1000);

    global.logger.info('Data cleanup task scheduled');
}