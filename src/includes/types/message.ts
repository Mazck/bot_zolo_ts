/**
 * Định nghĩa kiểu dữ liệu cho tin nhắn Zalo
 */

/**
* Enum cho kiểu định dạng văn bản
*/
export enum TextStyle {
    Bold = 0,
    Italic = 1,
    Underline = 2,
    StrikeThrough = 3,
    Red = 4,
    Orange = 5,
    Yellow = 6,
    Green = 7,
    Small = 8,
    Big = 9,
    UnorderedList = 10,
    OrderedList = 11,
    Indent = 12
}

/**
 * Enum cho mức độ quan trọng của tin nhắn
*/
export enum Urgency {
    Default = 0,
    Important = 1,
    Urgent = 2
}

/**
 * Enum cho loại tin nhắn
 */
export enum MessageType {
    Text = 0,
    System = 1,
    Sticker = 2,
    Image = 3,
    Video = 4,
    File = 5,
    Audio = 6,
    Location = 7,
    Contact = 8,
    Link = 9
}

/**
 * Enum cho loại thread
 */
export enum ThreadType {
    User = 0,
    Group = 1
}

/**
 * Interface cho kiểu dữ liệu đề cập người dùng
 */ 
export interface Mention {
    pos: number;    // Vị trí bắt đầu của đề cập
    len: number;    // Độ dài của đề cập
    uid: string;    // ID người dùng được đề cập
}

/**
 * Interface cho kiểu dữ liệu định dạng văn bản
 */ 
export interface TextStyleData {
    start: number;           // Vị trí bắt đầu của định dạng
    len: number;             // Độ dài của định dạng
    st: TextStyle;           // Kiểu định dạng
    indentSize?: number;     // Kích thước thụt lề (chỉ cho Indent)
}

/**
 * Interface cho kiểu dữ liệu tệp đính kèm
 */ 
export interface Attachment {
    type: number;     // Loại tệp đính kèm
    url: string;      // URL của tệp đính kèm
    size?: number;    // Kích thước tệp (byte)
    name?: string;    // Tên tệp
    width?: number;   // Chiều rộng (cho hình ảnh, video)
    height?: number;  // Chiều cao (cho hình ảnh, video)
    duration?: number; // Thời lượng (cho video, audio)
}

/**
 * Interface cho kiểu dữ liệu trích dẫn
 */ 
export interface Quote {
    msgId: string;    // ID tin nhắn được trích dẫn
    content: string;  // Nội dung tin nhắn được trích dẫn
    uidFrom?: string; // ID người gửi tin nhắn được trích dẫn
}

/**
 * Interface cho kiểu dữ liệu tin nhắn nhận được
 */
export interface IncomingMessage {
    threadId: string;    // ID của cuộc trò chuyện
    type: ThreadType;    // Loại cuộc trò chuyện
    data: {
        msgId: string;     // ID của tin nhắn
        uidFrom: string;   // ID người gửi
        content?: string;  // Nội dung tin nhắn (đối với tin nhắn văn bản)
        msgType?: number;  // Loại tin nhắn
        attachments?: Attachment[]; // Các tệp đính kèm
        mentions?: Mention[]; // Các đề cập người dùng
        quote?: Quote;     // Tin nhắn được trích dẫn
        timestamp: number; // Thời gian nhận tin nhắn
    }
}

/**
 * Interface cho kiểu dữ liệu tin nhắn gửi đi
 */ 
export interface OutgoingMessage {
    msg: string;                // Nội dung tin nhắn
    styles?: TextStyleData[];   // Các định dạng văn bản
    urgency?: Urgency;          // Mức độ quan trọng
    mentions?: Mention[];       // Các đề cập người dùng
    attachments?: string[];     // Đường dẫn đến các tệp đính kèm
    quote?: any;                // Tin nhắn để trích dẫn
    replyToMessageID?: number;  // ID tin nhắn để phản hồi
    ttl?: number;               // Thời gian tồn tại của tin nhắn (mili giây)
}

/**
 * Enum định nghĩa các kiểu hiển thị cho tin nhắn
 */
export enum TextStyle {
    DEFAULT = 'default',
    INFO = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
    HIGHLIGHT = 'highlight',
    CODE = 'code',
    QUOTE = 'quote',
    BOLD = 'bold',
}

/**
 * Interface cho các tin nhắn
 */
export interface Message {
    content: string;
    style?: TextStyle;
    author?: string;
    timestamp?: Date;
    attachments?: Attachment[];
    // Thêm các thuộc tính khác nếu cần
}


/**
 * Interface cho các tin nhắn embed
 */
export interface Embed {
    title?: string;
    description?: string;
    color?: string | number;
    fields?: EmbedField[];
    thumbnail?: string;
    image?: string;
    footer?: string;
    // Thêm các thuộc tính khác nếu cần
}

/**
 * Interface cho các trường trong embed
 */
export interface EmbedField {
    name: string;
    value: string;
    inline?: boolean;
}
