/**
 * A set of functions called "actions" for `chat`
 */

import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Define the message type
type Message = {
  role: "user" | "assistant" | "system"
  content: string
}

// System prompt to define the AI's behavior
const systemPrompt = `
Bạn là trợ lý ảo của Bảo tàng Lịch sử Quân sự Việt Nam. Hãy trả lời các câu hỏi về bảo tàng một cách lịch sự, chính xác và hữu ích.

Thông tin về bảo tàng:
- Tên: Bảo tàng Lịch sử Quân sự Việt Nam
- Địa chỉ mới (từ 1/11/2023): Số 2 Lê Đức Thọ, phường Mỹ Đình 2, quận Nam Từ Liêm, Hà Nội
- Giờ mở cửa: 8:00 - 17:00 (Thứ Hai - Thứ Sáu), 8:00 - 18:00 (Thứ Bảy - Chủ Nhật), 9:00 - 16:00 (Ngày Lễ)
- Vé tham quan: Miễn phí (từ 1/11/2023)
- Thành lập: 17/7/1956
- Các khu vực trưng bày: Khu trưng bày chiến tranh chống Pháp, Khu trưng bày chiến tranh chống Mỹ, Khu trưng bày vũ khí, Khu trưng bày hiện vật lịch sử, Khu trưng bày ngoài trời
- Hiện vật nổi bật: Xe tăng T-54 số hiệu 843 đã húc đổ cổng Dinh Độc Lập vào trưa ngày 30/4/1975, Máy bay MiG-21 do Anh hùng Phạm Tuân điều khiển bắn rơi máy bay B-52 của Mỹ, Đại bác thần công thời Nguyễn, và nhiều vũ khí, trang thiết bị quân sự từ các thời kỳ lịch sử khác nhau.

Hãy trả lời bằng tiếng Việt, ngắn gọn, súc tích và thân thiện. Nếu bạn không biết câu trả lời, hãy thành thật nói rằng bạn không có thông tin về vấn đề đó và đề nghị người dùng liên hệ trực tiếp với bảo tàng để biết thêm chi tiết.
`

export default {
  async sendMessage(ctx) {
    const { message, sessionId } = ctx.request.body;
    const { user } = ctx.state;
    const { id: userId } = user;

    const lastMessages = await strapi.entityService.findMany('api::message.message', {
      filters: {
        users_permissions_user: userId,
        sessionId: sessionId,
      },
      sort: ['createdAt:desc'],
      limit: 5,
    })

    const messages = lastMessages.map((msg) => ({
      role: msg.role,
      content: msg.message,
    }))

    messages.unshift({
      role: 'user',
      content: message,
    })

    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        dangerouslyAllowBrowser: true,
      })
  
      // Prepend the system prompt to the messages array
      const messagesWithSystemPrompt = [
        { role: "system", content: systemPrompt },
        ...messages,
      ]
  
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messagesWithSystemPrompt as ChatCompletionMessageParam[],
        temperature: 0.7,
      })

      await strapi.entityService.create('api::message.message', {
        data: {
          role: 'user',
          message: message,
          users_permissions_user: userId,
          sessionId: sessionId,
        },
      })

      await strapi.entityService.create('api::message.message', {
        data: {
          role: 'assistant',
          message: response.choices[0].message.content,
          users_permissions_user: userId,
          sessionId: sessionId,
        },
      })
  
      return response.choices[0].message.content || "Không có câu trả lời từ AI."
    } catch (error) {
      console.error("Error in AI chat:", error)
    }
    
  },


  async getMessages(ctx) {
    const { sessionId } = ctx.request.query;
    const messages = await strapi.entityService.findMany('api::message.message', {
      filters: {
        sessionId: sessionId,
      },
      sort: ['createdAt:desc'],
    })

    return messages;
  }
};
