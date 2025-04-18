import { Db, Collection } from "@datastax/astra-db-ts";
import { OpenAI } from "openai";
import { connectToDatabase } from "./astradb";

const genAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Tạo embedding cho nội dung và lưu vào Astra DB
 * @param data Dữ liệu cần đồng bộ
 * @param collection Collection trong Astra DB
 * @param id ID của bản ghi
 */
export const syncToAstraDB = async (
  data: any,
  collectionName: string,
  id: number,
  contentType: string
) => {
  try {
    const db = connectToDatabase();
    const collection = await db.collection(collectionName);

    // Tạo nội dung để tạo embedding
    let content = '';
    
    if (contentType === 'post') {
      content = `
        Tiêu đề: ${data.title || ''}
        Trích đoạn: ${data.excerpt || ''}
        Nội dung: ${JSON.stringify(data.content) || ''}
        Tác giả: ${data.author || ''}
        Danh mục: ${data.category?.name || ''}
      `;
    } else if (contentType === 'exhibit') {
      content = `
        Tên hiện vật: ${data.name || ''}
        Mô tả: ${data.description || ''}
        Thời kỳ: ${data.period || ''}
        Địa điểm: ${data.location || ''}
        Ý nghĩa lịch sử: ${data.historicalSignificance || ''}
        Lịch sử: ${data.history || ''}
        Năm: ${data.year || ''}
        Danh mục: ${data.category_artifact?.name || ''}
      `;
    }

    // Xóa các bản ghi cũ của entity này (nếu có)
    await collection.deleteMany({
      entityId: id,
      contentType: contentType
    });

    // Tạo embedding
    const result = await genAI.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    });

    const vector = result.data[0].embedding;

    // Lưu vào Astra DB
    await collection.insertOne({
      $vector: vector,
      text: content,
      entityId: id,
      contentType: contentType
    });

    console.log(`Synced ${contentType} #${id} to AstraDB successfully`);
  } catch (error) {
    console.error(`Error syncing ${contentType} #${id} to AstraDB:`, error);
  }
};

/**
 * Xóa bản ghi khỏi Astra DB
 * @param collectionName Tên collection trong Astra DB
 * @param id ID của bản ghi
 * @param contentType Loại nội dung ('post' hoặc 'exhibit')
 */
export const removeFromAstraDB = async (
  collectionName: string,
  id: number,
  contentType: string
) => {
  try {
    const db = connectToDatabase();
    const collection = await db.collection(collectionName);

    // Xóa bản ghi khỏi Astra DB
    const result = await collection.deleteMany({
      entityId: id,
      contentType: contentType
    });

    console.log(`Removed ${contentType} #${id} from AstraDB successfully`);
    return result;
  } catch (error) {
    console.error(`Error removing ${contentType} #${id} from AstraDB:`, error);
  }
}; 