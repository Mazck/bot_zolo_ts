/**
 * File: src/types.d.ts
 * Mô tả: Type definitions for ZCA-JS library
 * Based on documentation: https://tdung.gitbook.io/zca-js
 */

declare module 'zca-js' {
    export class Zalo {
        constructor(options?: ZaloOptions);
        login(credentials: ZaloCredentials): Promise<ZaloAPI>;
    }

    export interface ZaloOptions {
        selfListen?: boolean;
        checkUpdate?: boolean;
        logging?: boolean;
        preventTyping?: boolean;
    }

    export interface ZaloCredentials {
        cookie: any;
        imei?: string;
        userAgent?: string;
        saveCredentials?: boolean;
        credentialsPath?: string;
    }

    export interface ZaloAPI {
        id: string;
        listener: EventListener;
        getUserInfo(userId: string): Promise<UserInfo>;
        getGroupInfo(groupId: string): Promise<GroupInfo>;
        sendMessage(content: string | MessageOptions, threadId: string, threadType?: ThreadType): Promise<any>;
        setTyping(isTyping: boolean, threadId: string, threadType?: ThreadType): Promise<any>;
        logout(): Promise<boolean>;
    }

    export interface EventListener {
        start(): void;
        stop(): void;
        on(event: 'message' | 'reaction' | 'group_event' | 'friend_request' | 'typing' | 'seen', callback: (data: any) => void): void;
        once(event: 'message' | 'reaction' | 'group_event' | 'friend_request' | 'typing' | 'seen', callback: (data: any) => void): void;
        removeListener(event: string, callback: (data: any) => void): void;
    }

    export interface UserInfo {
        id: string;
        displayName: string;
        avatar: string;
        profileUrl: string;
        gender?: 'male' | 'female' | 'other';
        phoneNumber?: string;
        birthdate?: string;
    }

    export interface GroupInfo {
        id: string;
        name: string;
        avatar: string;
        participantIds: string[];
        adminIds: string[];
        ownerIds: string[];
        totalParticipants: number;
    }

    export interface MessageOptions {
        msg: string;
        mentions?: MentionObject[];
        styles?: StyleObject[];
        quote?: any;
        attachments?: string[];
        sticker?: string;
        urgency?: Urgency;
    }

    export interface MentionObject {
        pos: number;
        len: number;
        uid: string;
    }

    export interface StyleObject {
        start: number;
        len: number;
        st: TextStyle;
    }

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
}