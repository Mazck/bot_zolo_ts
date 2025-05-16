/**
 * File: src/events/reactionHandler.ts
 * Mô tả: Xử lý sự kiện reaction (thả cảm xúc)
 */

import global from '../global';

/**
 * Thiết lập trình lắng nghe sự kiện reaction
 */
export function setupReactionListener() {
    if (!global.bot) {
        global.logger.error('Bot chưa được khởi tạo, không thể thiết lập reaction listener');
        return;
    }

    global.bot.listener.on('reaction', async (event) => {
        try {
            // Lấy các thông tin từ sự kiện
            const { threadId, data } = event;

            // Kiểm tra nếu phải reaction từ chính bot
            if (event.isSelf) {
                return;
            }

            // Xử lý các loại reaction khác nhau
            switch (data.emoji) {
                // Có thể xử lý các reaction đặc biệt ở đây
                // VD: Reaction "👍" vào tin nhắn của bot để thực hiện hành động

                default:
                    // Ghi log reaction
                    global.logger.debug(`Reaction: ${data.emoji} từ ${data.userId} trong ${threadId}`);
                    break;
            }

            // Thực hiện các hành động theo reaction
            await handleReactionActions(event);

        } catch (error) {
            global.logger.error(`Lỗi xử lý reaction: ${error}`);
        }
    });

    global.logger.info('Đã thiết lập reaction listener');
}

/**
 * Xử lý các hành động dựa trên reaction
 * Có thể mở rộng để xử lý các tình huống như:
 * - Reaction để xác nhận thanh toán
 * - Reaction để tham gia trò chơi/khảo sát
 * - v.v.
 */
async function handleReactionActions(event) {
    // Phân tích dữ liệu reaction
    const { threadId, type, data } = event;
    const isGroup = type === 'Group';
    const senderId = data.userId;
    const emoji = data.emoji;
    const messageId = data.messageId;

    // Có thể lưu trữ các tin nhắn đặc biệt để xử lý reaction sau này
    // Ví dụ: Tin nhắn khảo sát, tin nhắn xác nhận, v.v.

    // Ví dụ xử lý reaction 👍 trên tin nhắn để xác nhận hành động
    if (emoji === '👍') {
        // Có thể cài đặt logic xác nhận ở đây
        // Ví dụ: Xác nhận thanh toán, xác nhận tham gia sự kiện, v.v.

        // Lấy nội dung tin nhắn gốc nếu cần
        try {
            // Lấy tin nhắn gốc nếu API hỗ trợ
            // const originalMessage = await global.bot.getMessageById(messageId);

            // Xử lý dựa trên nội dung tin nhắn gốc
            // if (originalMessage && originalMessage.body.includes('xác nhận')) {
            //   // Xử lý logic xác nhận
            // }
        } catch (error) {
            global.logger.error(`Lỗi xử lý tin nhắn gốc: ${error}`);
        }
    }
}