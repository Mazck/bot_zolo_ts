import crypto from 'crypto';
import { Command } from '../types';
import global from '../global';

/**
 * Parses a command from text
 * @param text Message text
 * @param prefix Command prefix
 * @returns Command and arguments, or null if not a command
 */
export function parseCommand(text: string, prefix: string): { command: string, args: string[] } | null {
    if (!text.startsWith(prefix)) {
        return null;
    }

    const args = text.slice(prefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase() || '';

    return { command, args };
}

/**
 * Generates a UUID
 * @returns Random UUID string
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Generates a random key
 * @param length Length of the key
 * @returns Random alphanumeric string
 */
export function generateRandomKey(length: number = 16): string {
    return crypto.randomBytes(length)
        .toString('base64')
        .replace(/[+/=]/g, '')  // Remove non-alphanumeric characters
        .substring(0, length);   // Ensure exact length
}

/**
 * Generates a payment code
 * @param prefix Payment code prefix
 * @returns Payment code
 */
export function generatePaymentCode(prefix: string = 'PAYMENT'): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${randomStr}`.toUpperCase();
}

/**
 * Finds a command by name or alias
 * @param commandName Command name or alias
 * @returns Command object or undefined
 */
export function findCommand(commandName: string): Command | undefined {
    // Find direct command match
    let command = global.commands?.get(commandName);

    // Check aliases if no direct match
    if (!command && global.commands) {
        for (const [name, cmd] of global.commands.entries()) {
            if (cmd.aliases && cmd.aliases.includes(commandName)) {
                command = cmd;
                break;
            }
        }
    }

    return command;
}

/**
 * Formats remaining time in a human readable way
 * @param endDate End date/time
 * @returns Formatted time string
 */
export function formatTimeRemaining(endDate: Date): string {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) {
        return 'Đã hết hạn';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days} ngày ${hours} giờ`;
    } else if (hours > 0) {
        return `${hours} giờ ${minutes} phút`;
    } else {
        return `${minutes} phút`;
    }
}

export default {
    parseCommand,
    generateUUID,
    generateRandomKey,
    generatePaymentCode,
    findCommand,
    formatTimeRemaining
};