export interface Command {
    name: string;
    aliases?: string[];
    description: string;
    usage: string;
    requiredPermission: string;
    execute: (params: CommandParams) => Promise<void>;
}

export interface MentionObject {
    pos: number;
    len: number;
    uid: string;
}

// For text styles in messages
export interface StyleObject {
    start: number;
    len: number;
    st: TextStyle; // Using the TextStyle enum
}

// Message options interface
export interface MessageOptions {
    msg: string;
    mentions?: MentionObject[];
    styles?: StyleObject[];
    quote?: any;
    attachments?: string[];
    urgency?: Urgency;
}

export interface CommandParams {
    message: any;
    args: string[];
    userId: string;
    groupId?: string;
    isGroup: boolean;
}

// ZaloJS related enums (for direct use in the code)
export enum ThreadType {
    User = 'User',
    Group = 'Group'
}

export enum TextStyle {
    Bold = 'bold',
    Italic = 'italic',
    Red = 'red',
    Green = 'green',
    Blue = 'blue',
    Underline = 'underline',
    Strikethrough = 'strikethrough'
}

export enum Urgency {
    Normal = 'normal',
    Important = 'important'
}

export enum GroupEventType {
    JOIN = 'join',
    LEAVE = 'leave',
    UPDATE = 'update',
    ADD_ADMIN = 'add_admin',
    REMOVE_ADMIN = 'remove_admin',
    REMOVE_MEMBER = 'remove_member',
    BLOCK_MEMBER = 'block_member',
    JOIN_REQUEST = 'join_request'
}

// Package Type
export interface Package {
    name: string;
    price: number;
    days: number;
    description: string;
}

// Other types from your types.ts file
export interface User {
    id: string;
    name: string;
    permission: string;
}

export interface Group {
    id: string;
    name: string;
    isActive: boolean;
    activatedAt?: Date;
    expiresAt?: Date;
}

export interface Payment {
    id: string;
    userId: string;
    groupId: string;
    amount: number;
    payosTransactionId: string;
    packageType: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
}

export interface PayOSCreateLinkResponse {
    code: string;
    desc: string;
    data: {
        checkoutUrl: string;
        qrCode: string;
        orderId: string;
    }
}

export interface PayOSWebhookResponse {
    code: string;
    desc: string;
    data: {
        reference: string;
        orderCode: string;
        status: number;
        amount: number;
        currency: string;
        buyerName: string;
        buyerEmail: string;
        buyerPhone: string;
        description: string;
        transactionTime: string;
    }
}

export interface CommandTracker {
    id: string;
    userId: string;
    commandName: string;
    usedAt: Date;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    timestamp: number;
}

export interface MiddlewareConfig {
    checkActivation: boolean;
    checkPermission: boolean;
    checkSpam: boolean;
    onSuccess?: () => Promise<void>;
    onFailure?: (reason: string) => Promise<void>;
}

export interface WebhookResponse {
    success: boolean;
    message: string;
    code: number;
}

export interface UserInfo {
    id: string;
    displayName: string;
    avatar?: string;
    profileUrl?: string;
    gender?: 'male' | 'female' | 'other';
    phoneNumber?: string;
    birthdate?: string;
}

export interface GroupInfo {
    id: string;
    name: string;
    avatar?: string;
    participantIds?: string[];
    adminIds?: string[];
    ownerIds?: string[];
    totalParticipants?: number;
}

export interface MessageData {
    body: string;
    senderID: string;
    messageID: string;
    attachments?: any[];
    // Add other properties as needed
}

export interface GroupEventData {
    threadId: string;
    type: GroupEventType;
    data: {
        userIDs?: string[];
        userID?: string;
        adminType?: number;
        update_type?: 'name' | 'avatar' | string;
        // Add other properties as needed
    };
    isSelf: boolean;
}