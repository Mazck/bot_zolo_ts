import { Logger } from 'winston';
import { DataSource } from 'typeorm';
import { createLogger } from './utils/logger';
import { Command } from './types';

// Define ZaloAPI interface 
export interface ZaloAPI {
    id?: string;
    listener: {
        start(): void;
        stop(): void;
        on(event: string, callback: (data: any) => void): void;
    };
    getUserInfo(userId: string): Promise<any>;
    getGroupInfo(groupId: string): Promise<any>;
    sendMessage(content: any, threadId: string, threadType: any): Promise<any>;
    // Add other methods as needed
    [key: string]: any;
}

// Global state interface
interface Global {
    bot: ZaloAPI | null;              // Zalo API instance
    db: DataSource | null;            // Database connection
    logger: Logger;                   // Logger
    commands: Map<string, Command>;   // Command registry
    config: {                         // Runtime configuration
        startTime: Date;                // Application start time
        processId: string;              // Process ID
        environment: string;            // Environment (development/production)
        isReady: boolean;               // Application readiness state
    };
}

// Initialize default values
const global: Global = {
    bot: null,
    db: null,
    logger: createLogger(),
    commands: new Map<string, Command>(),
    config: {
        startTime: new Date(),
        processId: `zca-bot-${Date.now().toString(36)}`,
        environment: process.env.NODE_ENV || 'development',
        isReady: false
    }
};

export default global;