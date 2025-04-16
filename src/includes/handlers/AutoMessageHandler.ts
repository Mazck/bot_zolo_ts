/**
 * Xử lý tin nhắn tự động cho Zalo
 */
import {
    OutgoingMessage,
    TextStyleData,
    ThreadType,
    Urgency,
    Mention
} from '../types/message';
import { MessageHandler } from './messageHandler';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

// Cấu trúc dữ liệu cho tin nhắn tự động
export interface AutoMessage {
    id: string;
    name: string;
    content: string;
    schedule: {
        enabled: boolean;
        cronExpression?: string; // Định dạng cron để lập lịch
        interval?: number; // Hoặc khoảng thời gian (ms)
    };
    targets: {
        threadId: string;
        threadType: ThreadType;
    }[];
    attachments?: {
        url: string;
        localPath: string;
    }[];
    styles?: TextStyleData[];  // Sử dụng TextStyleData thay vì TextStyle
    mentions?: Mention[];
    urgency?: Urgency;
    lastSent?: number; // Timestamp
    active: boolean;
}

export interface AutoMessageConfig {
    dataPath: string;
    attachmentDir: string;
    defaultInterval: number;
}

export class AutoMessageHandler {
    private messageHandler: MessageHandler;
    private config: AutoMessageConfig;
    private messages: AutoMessage[] = [];
    private scheduledJobs: Map<string, any> = new Map();
    private dataFile: string;

    /**
     * Khởi tạo handler tin nhắn tự động
     * @param messageHandler Instance của MessageHandler để gửi tin nhắn
     * @param config Cấu hình cho AutoMessageHandler
     */
    constructor(messageHandler: MessageHandler, config: AutoMessageConfig) {
        this.messageHandler = messageHandler;
        this.config = {
            dataPath: config.dataPath || './data',
            attachmentDir: config.attachmentDir || './attachments',
            defaultInterval: config.defaultInterval || 3600000 // 1 giờ mặc định
        };

        this.dataFile = path.join(this.config.dataPath, 'autoMessages.json');

        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(this.config.dataPath)) {
            fs.mkdirSync(this.config.dataPath, { recursive: true });
        }

        if (!fs.existsSync(this.config.attachmentDir)) {
            fs.mkdirSync(this.config.attachmentDir, { recursive: true });
        }

        this.loadMessages();
        this.scheduleAllMessages();
    }

    /**
     * Tải danh sách tin nhắn từ file JSON
     */
    private loadMessages(): void {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = fs.readFileSync(this.dataFile, 'utf8');
                this.messages = JSON.parse(data);
                console.log(`Đã tải ${this.messages.length} tin nhắn tự động.`);
            } else {
                this.messages = [];
                this.saveMessages();
                console.log('Tạo file dữ liệu tin nhắn tự động mới.');
            }
        } catch (error) {
            console.error('Lỗi khi tải tin nhắn tự động:', error);
            this.messages = [];
        }
    }

    /**
     * Lưu danh sách tin nhắn vào file JSON
     */
    private saveMessages(): void {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(this.messages, null, 2), 'utf8');
            console.log('Đã lưu dữ liệu tin nhắn tự động.');
        } catch (error) {
            console.error('Lỗi khi lưu tin nhắn tự động:', error);
        }
    }

    /**
     * Lên lịch cho tất cả tin nhắn tự động
     */
    private scheduleAllMessages(): void {
        // Hủy tất cả các job đã lên lịch trước đó
        this.scheduledJobs.forEach((job) => {
            if (job.stop) job.stop();
        });
        this.scheduledJobs.clear();

        // Lên lịch cho các tin nhắn mới
        this.messages.forEach((message) => {
            if (message.active && message.schedule.enabled) {
                this.scheduleMessage(message);
            }
        });
    }

    /**
     * Lên lịch cho một tin nhắn tự động
     * @param message Tin nhắn cần lên lịch
     */
    private scheduleMessage(message: AutoMessage): void {
        if (!message.schedule.enabled || !message.active) return;

        if (message.schedule.cronExpression) {
            // Sử dụng biểu thức cron
            try {
                const job = cron.schedule(message.schedule.cronExpression, () => {
                    this.sendAutoMessage(message);
                });
                this.scheduledJobs.set(message.id, job);
                console.log(`Đã lên lịch tin nhắn "${message.name}" với cron: ${message.schedule.cronExpression}`);
            } catch (error) {
                console.error(`Lỗi khi lên lịch tin nhắn "${message.name}":`, error);
            }
        } else if (message.schedule.interval) {
            // Sử dụng interval
            const interval = setInterval(() => {
                this.sendAutoMessage(message);
            }, message.schedule.interval);
            this.scheduledJobs.set(message.id, { stop: () => clearInterval(interval) });
            console.log(`Đã lên lịch tin nhắn "${message.name}" với interval: ${message.schedule.interval}ms`);
        }
    }

    /**
     * Gửi tin nhắn tự động
     * @param message Tin nhắn cần gửi
     */
    private async sendAutoMessage(message: AutoMessage): Promise<void> {
        try {
            // Chuẩn bị danh sách đường dẫn tệp đính kèm
            const attachmentPaths: string[] = [];
            if (message.attachments && message.attachments.length > 0) {
                message.attachments.forEach(attachment => {
                    if (attachment.localPath && fs.existsSync(attachment.localPath)) {
                        attachmentPaths.push(attachment.localPath);
                    }
                });
            }

            // Gửi tin nhắn đến tất cả các target
            for (const target of message.targets) {
                const options: OutgoingMessage = {
                    msg: message.content,
                    styles: message.styles,
                    mentions: message.mentions,
                    attachments: attachmentPaths.length > 0 ? attachmentPaths : undefined,
                    urgency: message.urgency
                };

                await this.messageHandler.sendMessage(options, target.threadId, target.threadType);
                console.log(`Đã gửi tin nhắn tự động "${message.name}" đến ${target.threadId}`);
            }

            // Cập nhật thời gian gửi cuối cùng
            message.lastSent = Date.now();
            this.saveMessages();
        } catch (error) {
            console.error(`Lỗi khi gửi tin nhắn tự động "${message.name}":`, error);
        }
    }

    /**
     * Tải file từ URL và lưu vào thư mục đính kèm
     * @param url URL của file cần tải
     * @returns Đường dẫn đến file đã tải
     */
    private async downloadFile(url: string): Promise<string> {
        try {
            const response = await axios({
                method: 'GET',
                url: url,
                responseType: 'stream'
            });

            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const extension = this.getFileExtension(contentType, url);
            const fileName = `${Date.now()}_${uuidv4().substring(0, 8)}${extension}`;
            const filePath = path.join(this.config.attachmentDir, fileName);

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(filePath));
                writer.on('error', reject);
            });
        } catch (error) {
            console.error('Lỗi khi tải file:', error);
            throw error;
        }
    }

    /**
     * Lấy phần mở rộng file từ Content-Type hoặc URL
     * @param contentType Content-Type của file
     * @param url URL của file
     * @returns Phần mở rộng file
     */
    private getFileExtension(contentType: string, url: string): string {
        // Thử lấy phần mở rộng từ URL trước
        const urlExtMatch = url.match(/\.(jpg|jpeg|png|gif|mp4|mp3|pdf|doc|docx|xls|xlsx)$/i);
        if (urlExtMatch) {
            return `.${urlExtMatch[1].toLowerCase()}`;
        }

        // Nếu không có, dựa vào Content-Type
        const contentTypeMap: { [key: string]: string } = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'video/mp4': '.mp4',
            'audio/mpeg': '.mp3',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
        };

        return contentTypeMap[contentType] || '.bin';
    }

    /**
     * Thêm tin nhắn tự động mới
     * @param message Tin nhắn cần thêm
     * @returns ID của tin nhắn đã thêm
     */
    public async addMessage(message: Partial<AutoMessage>): Promise<string> {
        const id = message.id || uuidv4();

        const newMessage: AutoMessage = {
            id,
            name: message.name || `AutoMessage_${id.substring(0, 8)}`,
            content: message.content || '',
            schedule: message.schedule || {
                enabled: false,
                interval: this.config.defaultInterval
            },
            targets: message.targets || [],
            attachments: message.attachments || [],
            styles: message.styles,
            mentions: message.mentions,
            urgency: message.urgency,
            active: message.active !== undefined ? message.active : true
        };

        this.messages.push(newMessage);
        this.saveMessages();

        if (newMessage.schedule.enabled && newMessage.active) {
            this.scheduleMessage(newMessage);
        }

        return id;
    }

    /**
     * Cập nhật tin nhắn tự động
     * @param id ID của tin nhắn cần cập nhật
     * @param updates Các cập nhật cho tin nhắn
     * @returns true nếu cập nhật thành công, false nếu không tìm thấy tin nhắn
     */
    public async updateMessage(id: string, updates: Partial<AutoMessage>): Promise<boolean> {
        const index = this.messages.findIndex(msg => msg.id === id);
        if (index === -1) return false;

        // Cập nhật tin nhắn
        this.messages[index] = {
            ...this.messages[index],
            ...updates
        };

        // Hủy job hiện tại nếu có
        if (this.scheduledJobs.has(id)) {
            const job = this.scheduledJobs.get(id);
            if (job && job.stop) job.stop();
            this.scheduledJobs.delete(id);
        }

        // Lên lịch lại nếu cần
        if (this.messages[index].schedule.enabled && this.messages[index].active) {
            this.scheduleMessage(this.messages[index]);
        }

        this.saveMessages();
        return true;
    }

    /**
     * Xóa tin nhắn tự động
     * @param id ID của tin nhắn cần xóa
     * @returns true nếu xóa thành công, false nếu không tìm thấy tin nhắn
     */
    public deleteMessage(id: string): boolean {
        const index = this.messages.findIndex(msg => msg.id === id);
        if (index === -1) return false;

        // Hủy job nếu có
        if (this.scheduledJobs.has(id)) {
            const job = this.scheduledJobs.get(id);
            if (job && job.stop) job.stop();
            this.scheduledJobs.delete(id);
        }

        // Xóa tin nhắn
        this.messages.splice(index, 1);
        this.saveMessages();
        return true;
    }

    /**
     * Lấy danh sách tất cả tin nhắn tự động
     * @returns Danh sách tin nhắn tự động
     */
    public getAllMessages(): AutoMessage[] {
        return [...this.messages];
    }

    /**
     * Lấy tin nhắn tự động theo ID
     * @param id ID của tin nhắn cần lấy
     * @returns Tin nhắn tự động hoặc undefined nếu không tìm thấy
     */
    public getMessageById(id: string): AutoMessage | undefined {
        return this.messages.find(msg => msg.id === id);
    }

    /**
     * Thêm URL đính kèm vào tin nhắn tự động
     * @param messageId ID của tin nhắn
     * @param url URL của file đính kèm
     * @returns true nếu thêm thành công, false nếu không tìm thấy tin nhắn
     */
    public async addAttachment(messageId: string, url: string): Promise<boolean> {
        try {
            const message = this.messages.find(msg => msg.id === messageId);
            if (!message) return false;

            // Tải file từ URL
            const localPath = await this.downloadFile(url);

            // Thêm vào danh sách đính kèm
            if (!message.attachments) {
                message.attachments = [];
            }

            message.attachments.push({
                url,
                localPath
            });

            this.saveMessages();
            return true;
        } catch (error) {
            console.error(`Lỗi khi thêm đính kèm cho tin nhắn ${messageId}:`, error);
            return false;
        }
    }

    /**
     * Xóa đính kèm khỏi tin nhắn tự động
     * @param messageId ID của tin nhắn
     * @param attachmentUrl URL của đính kèm cần xóa
     * @returns true nếu xóa thành công, false nếu không tìm thấy
     */
    public removeAttachment(messageId: string, attachmentUrl: string): boolean {
        const message = this.messages.find(msg => msg.id === messageId);
        if (!message || !message.attachments) return false;

        const index = message.attachments.findIndex(att => att.url === attachmentUrl);
        if (index === -1) return false;

        // Xóa file nếu tồn tại
        const attachment = message.attachments[index];
        if (attachment.localPath && fs.existsSync(attachment.localPath)) {
            try {
                fs.unlinkSync(attachment.localPath);
            } catch (error) {
                console.error(`Không thể xóa file ${attachment.localPath}:`, error);
            }
        }

        // Xóa khỏi danh sách
        message.attachments.splice(index, 1);
        this.saveMessages();
        return true;
    }

    /**
     * Gửi tin nhắn tự động ngay lập tức
     * @param messageId ID của tin nhắn cần gửi
     * @returns true nếu gửi thành công, false nếu không tìm thấy tin nhắn
     */
    public async sendNow(messageId: string): Promise<boolean> {
        const message = this.messages.find(msg => msg.id === messageId);
        if (!message) return false;

        await this.sendAutoMessage(message);
        return true;
    }

    /**
     * Kích hoạt/vô hiệu hóa tin nhắn tự động
     * @param messageId ID của tin nhắn
     * @param active true để kích hoạt, false để vô hiệu hóa
     * @returns true nếu thành công, false nếu không tìm thấy tin nhắn
     */
    public toggleActive(messageId: string, active: boolean): boolean {
        const message = this.messages.find(msg => msg.id === messageId);
        if (!message) return false;

        message.active = active;

        // Hủy job hiện tại nếu có
        if (this.scheduledJobs.has(messageId)) {
            const job = this.scheduledJobs.get(messageId);
            if (job && job.stop) job.stop();
            this.scheduledJobs.delete(messageId);
        }

        // Lên lịch lại nếu kích hoạt
        if (active && message.schedule.enabled) {
            this.scheduleMessage(message);
        }

        this.saveMessages();
        return true;
    }
}