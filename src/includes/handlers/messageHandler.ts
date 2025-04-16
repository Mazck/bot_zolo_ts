/**
 * Xử lý tin nhắn Zalo
 */
import {
    OutgoingMessage,
    IncomingMessage,
    TextStyle,
    Urgency,
    ThreadType
} from '../types/message';

export class MessageHandler {
  private api: any;

  /**
   * Khởi tạo handler tin nhắn
   * @param api Instance API Zalo
   */
  constructor(api: any) {
    this.api = api;
  }

  /**
   * Gửi tin nhắn với nhiều tùy chọn
   * @param options Các tùy chọn cho tin nhắn
   * @param threadId ID của thread
   * @param type Loại thread
   * @returns Promise với kết quả gửi tin nhắn
   */
  async sendMessage(
    options: OutgoingMessage,
    threadId: string,
    type: ThreadType = ThreadType.User
  ): Promise<any> {
    try {
      const result = await this.api.sendMessage(options, threadId, type);
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Gửi tin nhắn văn bản đơn giản
   * @param msg Nội dung tin nhắn
   * @param threadId ID của thread
   * @param type Loại thread
   * @returns Promise với kết quả gửi tin nhắn
   */
  async sendText(
    msg: string,
    threadId: string,
    type: ThreadType = ThreadType.User
  ): Promise<any> {
    return this.sendMessage({ msg }, threadId, type);
  }

  /**
   * Gửi tin nhắn với định dạng văn bản
   * @param msg Nội dung tin nhắn
   * @param threadId ID của thread
   * @param styles Các định dạng văn bản
   * @param type Loại thread
   * @returns Promise với kết quả gửi tin nhắn
   */
  async sendStyledText(
    msg: string,
    threadId: string,
    styles: OutgoingMessage["styles"],
    type: ThreadType = ThreadType.User
  ): Promise<any> {
    return this.sendMessage({ msg, styles }, threadId, type);
  }

  /**
   * Gửi tin nhắn với đề cập người dùng
   * @param msg Nội dung tin nhắn
   * @param threadId ID của thread
   * @param mentions Các đề cập người dùng
   * @param type Loại thread
   * @returns Promise với kết quả gửi tin nhắn
   */
  async sendMentionText(
    msg: string,
    threadId: string,
    mentions: OutgoingMessage["mentions"],
    type: ThreadType = ThreadType.Group
  ): Promise<any> {
    return this.sendMessage({ msg, mentions }, threadId, type);
  }

  /**
   * Gửi tin nhắn trả lời
   * @param msg Nội dung tin nhắn
   * @param originalMessage Tin nhắn gốc
   * @returns Promise với kết quả gửi tin nhắn
   */
  async sendReply(msg: string, originalMessage: IncomingMessage): Promise<any> {
    return this.sendMessage(
      { msg, quote: originalMessage.data },
      originalMessage.threadId,
      originalMessage.type
    );
  }

  /**
   * Gửi tin nhắn với tệp đính kèm
   * @param msg Nội dung tin nhắn
   * @param threadId ID của thread
   * @param attachmentPaths Đường dẫn đến các tệp đính kèm
   * @param type Loại thread
   * @returns Promise với kết quả gửi tin nhắn
   */
  async sendAttachment(
    msg: string,
    threadId: string,
    attachmentPaths: string[],
    type: ThreadType = ThreadType.User
  ): Promise<any> {
    return this.sendMessage(
      { msg, attachments: attachmentPaths },
      threadId,
      type
    );
  }

  /**
   * Xóa tin nhắn
   * @param messageId ID của tin nhắn
   * @returns Promise với kết quả xóa tin nhắn
   */
  async deleteMessage(messageId: string): Promise<any> {
    try {
      const result = await this.api.deleteMessage(messageId);
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Thu hồi tin nhắn
   * @param messageId ID của tin nhắn
   * @returns Promise với kết quả thu hồi tin nhắn
   */
  async unsendMessage(messageId: string): Promise<any> {
    try {
      const result = await this.api.undo(messageId);
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Thả cảm xúc cho tin nhắn
   * @param messageId ID của tin nhắn
   * @param reactionId ID của cảm xúc
   * @returns Promise với kết quả thả cảm xúc
   */
  async addReaction(messageId: string, reactionId: number): Promise<any> {
    try {
      const result = await this.api.addReaction(messageId, reactionId);
      return {
        success: true,
        result: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
