/**
 * A set of functions called "actions" for `chat`
 */

import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { connectToDatabase } from '../../../services/astradb';
// Define the message type
type Message = {
  role: "user" | "assistant" | "system"
  content: string
}

// System prompt to define the AI's behavior
const systemPrompt = `
Bạn là một trợ lý ảo thông minh cho trang web chính thức của Bảo tàng Lịch sử Quân sự Việt Nam. Nhiệm vụ của bạn là hỗ trợ khách tham quan bằng cách cung cấp thông tin chính xác, đầy đủ và cập nhật về bảo tàng, bao gồm:

- Giới thiệu về bảo tàng: lịch sử hình thành, sứ mệnh, vị trí.
- Thông tin về các hiện vật trưng bày, bao gồm các bảo vật quốc gia.
- Chi tiết về các sự kiện, hoạt động triển lãm, hội thảo đang diễn ra hoặc sắp tới.
- Hướng dẫn tham quan: thời gian mở cửa, giá vé, nội quy, cách di chuyển.
- Lịch sử quân sự Việt Nam: các trận đánh, nhân vật lịch sử quan trọng, tư liệu tham khảo.
- Dữ liệu nghiên cứu và tài liệu liên quan đến lịch sử quân sự Việt Nam.

Hãy trả lời một cách thân thiện, dễ hiểu, chính xác và súc tích. Nếu không chắc chắn về một thông tin nào đó, hãy tìm kiếm dữ liệu từ các nguồn chính thống hoặc khuyến nghị người dùng truy cập trang web chính thức của bảo tàng.

📍 **Địa chỉ bảo tàng:** Km 6+500 Đại lộ Thăng Long, Phường Tây Mỗ, Phường Đại Mỗ, Nam Từ Liêm, Hà Nội  
📞 **Liên hệ:** (024) 3733 4464 | ✉️ info@btlsqsvn.vn  

🎟 **Thông tin vé tham quan:**  
- **Người lớn:** 40.000đ/vé  
- **Trẻ em:** 20.000đ/vé  
- **Đoàn:** 40.000đ/vé  

Nếu khách tham quan có các câu hỏi liên quan đến việc tổ chức tham quan theo đoàn hay các yêu cầu đặc biệt, hãy hướng dẫn họ liên hệ qua thông tin trên.

Bạn có thể cung cấp thông tin theo từng cấp độ, từ tóm tắt nhanh đến chi tiết đầy đủ tùy theo câu hỏi của người dùng. Hãy trả lời bằng ngôn ngữ mà người dùng sử dụng trong câu hỏi.

**Lịch sử chat:**  
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

    messages.push({
      role: 'user',
      content: message,
    })

    try {
      // Get relevant context from AstraDB
      const db = connectToDatabase();
      const collection = await db.collection("posts_collection");
      
      // Generate embedding for the user's query
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: message,
      });
      
      const queryVector = embedding.data[0].embedding;
      
      // Find similar documents in AstraDB
      const results = await collection.find({}, {
        sort: {
          $vector: queryVector
        },
        limit: 5
      }).toArray();
      
      // Prepare context from search results
      let contextFromDB = "";
      if (results && results.length > 0) {
        contextFromDB = "Thông tin liên quan:\n" + 
          results.map(doc => doc.text).join("\n\n");
      }
  
      // Prepend the system prompt to the messages array
      const messagesWithSystemPrompt = [
        { role: "system", content: systemPrompt },
        ...messages,
      ]
      
      // Add context if available
      if (contextFromDB) {
        messagesWithSystemPrompt.push({ 
          role: "system", 
          content: `Sử dụng thông tin sau đây để trả lời câu hỏi của người dùng:\n${contextFromDB}` 
        });
      }
  
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
      return "Đã xảy ra lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau."
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
