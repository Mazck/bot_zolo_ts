import {
    TextStyleData,
    Mention,
    Urgency as ExistingUrgency,
    ThreadType as ExistingThreadType
} from './message';

// Re-export các kiểu dữ liệu hiện có để sử dụng trong module này
export type TextStyle = TextStyleData;
export type { Mention };
export type Urgency = ExistingUrgency;
export type ThreadType = ExistingThreadType;

// Kiểu tin nhắn đi
export interface OutgoingMessage {
    msg: string;
    styles?: TextStyleData[];
    mentions?: Mention[];
    attachments?: string[];
    quote?: any;
    urgency?: ExistingUrgency;
}

// Kiểu tin nhắn đến
export interface IncomingMessage {
    data: any;
    threadId: string;
    type: ExistingThreadType;
    sender?: {
        id: string;
        name?: string;
    };
    senderID?: string;
    threadID?: string;
}

// Kiểu cấu hình lịch
export interface ScheduleConfig {
    enabled: boolean;
    cronExpression?: string;
    interval?: number;
}

// Kiểu đính kèm
export interface Attachment {
    url: string;
    localPath: string;
}

// Kiểu target
export interface MessageTarget {
    threadId: string;
    threadType: ExistingThreadType;
}