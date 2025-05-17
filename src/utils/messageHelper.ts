import { ThreadType, TextStyle, Urgency, StyleObject, MentionObject } from '../types/index'; // Import interfaces
import { formatNotification, formatError, formatSuccess } from './formatter';
import global from '../global';

/**
 * Gửi tin nhắn văn bản đơn giản
 * @param content Nội dung tin nhắn
 * @param threadId ID người dùng/nhóm
 * @param isGroup Có phải nhóm không
 * @returns Kết quả gửi tin nhắn
 */
export async function sendTextMessage(
    content: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    if (!global.bot) return null;

    try {
        return await global.bot.sendMessage(
            content,
            threadId,
            isGroup ? ThreadType.Group : ThreadType.User
        );
    } catch (error) {
        global.logger.error(`Lỗi gửi tin nhắn: ${error}`);
        return null;
    }
}

/**
 * Gửi tin nhắn quan trọng có định dạng
 * @param content Nội dung tin nhắn
 * @param threadId ID người dùng/nhóm
 * @param isGroup Có phải nhóm không
 * @returns Kết quả gửi tin nhắn
 */
export async function sendImportantMessage(
    content: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    if (!global.bot) return null;

    try {
        return await global.bot.sendMessage(
            {
                msg: content,
                urgency: Urgency.Important,
                styles: [
                    {
                        start: 0,
                        len: content.length,
                        st: TextStyle.Bold
                    }
                ]
            },
            threadId,
            isGroup ? ThreadType.Group : ThreadType.User
        );
    } catch (error) {
        global.logger.error(`Lỗi gửi tin nhắn quan trọng: ${error}`);
        return null;
    }
}

/**
 * Gửi tin nhắn có đề cập người dùng
 * @param content Nội dung tin nhắn
 * @param threadId ID nhóm
 * @param mentions Mảng các đề cập
 * @returns Kết quả gửi tin nhắn
 */
export async function sendMentionMessage(
    content: string,
    threadId: string,
    mentions: Array<{ userId: string, name: string }>
): Promise<any> {
    if (!global.bot) return null;

    try {
        // Tạo nội dung tin nhắn với đề cập
        let messageText = content;
        // Explicitly type the array
        const mentionObjects: MentionObject[] = [];
        let lastPos = messageText.length;

        // Thêm đề cập vào cuối nếu không có trong nội dung
        for (const mention of mentions) {
            const mentionText = `@${mention.name}`;

            // Kiểm tra nếu đề cập không có trong nội dung, thêm vào cuối
            if (!messageText.includes(mentionText)) {
                if (lastPos > 0 && !messageText.endsWith(' ')) {
                    messageText += ' ';
                    lastPos += 1;
                }

                messageText += mentionText;

                mentionObjects.push({
                    pos: lastPos,
                    len: mentionText.length,
                    uid: mention.userId
                });

                lastPos += mentionText.length + 1;
            } else {
                // Nếu đề cập đã có trong nội dung, tìm vị trí của nó
                const pos = messageText.indexOf(mentionText);

                mentionObjects.push({
                    pos: pos,
                    len: mentionText.length,
                    uid: mention.userId
                });
            }
        }

        if (!global.bot) {
            global.logger.error('Bot is null when sending mention message');
            return null;
        }

        return await global.bot.sendMessage(
            {
                msg: messageText,
                mentions: mentionObjects
            },
            threadId,
            ThreadType.Group
        );
    } catch (error) {
        global.logger.error(`Lỗi gửi tin nhắn đề cập: ${error}`);
        return null;
    }
}

/**
 * Gửi tin nhắn trả lời
 * @param content Nội dung tin nhắn
 * @param threadId ID người dùng/nhóm
 * @param originalMessage Tin nhắn gốc cần trả lời
 * @param isGroup Có phải nhóm không
 * @returns Kết quả gửi tin nhắn
 */
export async function sendReplyMessage(
    content: string,
    threadId: string,
    originalMessage: any,
    isGroup: boolean = false
): Promise<any> {
    if (!global.bot) return null;

    try {
        return await global.bot.sendMessage(
            {
                msg: content,
                quote: originalMessage
            },
            threadId,
            isGroup ? ThreadType.Group : ThreadType.User
        );
    } catch (error) {
        global.logger.error(`Lỗi gửi tin nhắn trả lời: ${error}`);
        return null;
    }
}

/**
 * Gửi tin nhắn với định dạng
 * @param content Nội dung tin nhắn
 * @param threadId ID người dùng/nhóm
 * @param styles Mảng các định dạng
 * @param isGroup Có phải nhóm không
 * @returns Kết quả gửi tin nhắn
 */
export async function sendStyledMessage(
    content: string,
    threadId: string,
    styles: Array<{ start: number, len: number, style: TextStyle }>,
    isGroup: boolean = false
): Promise<any> {
    if (!global.bot) return null;

    try {
        // Convert to StyleObject array
        const styleObjects: StyleObject[] = styles.map(style => ({
            start: style.start,
            len: style.len,
            st: style.style
        }));

        return await global.bot.sendMessage(
            {
                msg: content,
                styles: styleObjects
            },
            threadId,
            isGroup ? ThreadType.Group : ThreadType.User
        );
    } catch (error) {
        global.logger.error(`Lỗi gửi tin nhắn có định dạng: ${error}`);
        return null;
    }
}

/**
 * Gửi tin nhắn với tệp đính kèm
 * @param content Nội dung tin nhắn
 * @param threadId ID người dùng/nhóm
 * @param attachmentPaths Mảng đường dẫn tệp đính kèm
 * @param isGroup Có phải nhóm không
 * @returns Kết quả gửi tin nhắn
 */
export async function sendAttachmentMessage(
    content: string,
    threadId: any,
    attachmentPaths: any[],
    isGroup: boolean = false
): Promise<any> {
    if (!global.bot) return null;

    try {
        return await global.bot.sendMessage(
            {
                msg: content,
                attachments: attachmentPaths
            },
            threadId,
            isGroup ? ThreadType.Group : ThreadType.User
        );
    } catch (error) {
        global.logger.error(`Lỗi gửi tin nhắn có tệp đính kèm: ${error}`);
        return null;
    }
}

/**
 * Định dạng và gửi thông báo
 * @param title Tiêu đề thông báo
 * @param message Nội dung thông báo
 * @param threadId ID người nhận
 * @param isGroup Là nhóm hay không
 */
export async function sendNotification(
    title: string,
    message: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    const formattedMessage = formatNotification(title, message);
    return await sendTextMessage(formattedMessage, threadId, isGroup);
}

/**
 * Định dạng và gửi thông báo lỗi
 * @param message Nội dung lỗi
 * @param threadId ID người nhận
 * @param isGroup Là nhóm hay không
 */
export async function sendError(
    message: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    const formattedMessage = formatError(message);

    const styles = [
        {
            start: 0,
            len: formattedMessage.length,
            style: TextStyle.Red
        }
    ];

    return await sendStyledMessage(formattedMessage, threadId, styles, isGroup);
}

/**
 * Định dạng và gửi thông báo thành công
 * @param message Nội dung thông báo
 * @param threadId ID người nhận
 * @param isGroup Là nhóm hay không
 */
export async function sendSuccess(
    message: string,
    threadId: string,
    isGroup: boolean = false
): Promise<any> {
    const formattedMessage = formatSuccess(message);

    const styles = [
        {
            start: 0,
            len: formattedMessage.length,
            style: TextStyle.Green
        }
    ];

    return await sendStyledMessage(formattedMessage, threadId, styles, isGroup);
}