import { Db, DataAPIClient, Collection } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { OpenAI } from "openai";


type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

const myData = [
  'https://xaydungchinhsach.chinhphu.vn/tu-1-11-bao-tang-lich-su-quan-su-viet-nam-vi-tri-moi-mo-cua-don-khach-mien-phi-tham-quan-119241004184508454.htm',  
]

const genAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function connectToDatabase(): Db {
    const { ASTRA_DB_ENDPOINT: endpoint, ASTRA_DB_TOKEN: token } =
      process.env; 
  
    if (!token || !endpoint) {
      throw new Error(
        "Environment variables ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN must be defined.",
      );
    }
  
    // Create an instance of the `DataAPIClient` class with your token.
    const client = new DataAPIClient(token);
  
    // Get the database specified by your endpoint.
    const database = client.db(endpoint);
  
    console.log(`Connected to database ${database.id}`);
  
    return database;
}

export const checkOrCreateCollection = async (
    db: Db,
    collectionName: string,
    similarityMetric: SimilarityMetric = "dot_product"
  ) => {
    try {
      const collections = await db.listCollections();
      const collectionExists = collections.some(
        (col) => col.name === collectionName
      );
  
      if (collectionExists) {
        console.log(`Collection ${collectionName} already exists, skipping creation.`);
      } else {
        const res = await db.createCollection(`${collectionName}`, {
          vector: {
            dimension: 1536,
            metric: similarityMetric,
          },
        });
        console.log(`Collection created: ${res}`);
      }
    } catch (error) {
      console.error("Error checking or creating collection:", error);
    }
};

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
      launchOptions: {
        headless: true,
      },
      gotoOptions: {
        waitUntil: "domcontentloaded",
      },
      evaluate: async (page, browser) => {
        const result = await page.evaluate(() => document.body.innerHTML);
        await browser.close();
        return result;
      },
    });
    return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

export const loadSampleData = async (db: Db, collectionName: string) => {
    const collection = await db.collection(`${collectionName}`);
    
    // Kiểm tra xem collection đã có dữ liệu chưa
    const documents = await collection.find({}).toArray();
    if (documents.length > 0) {
      console.log(`Collection ${collectionName} already has data, skipping sample data loading.`);
      return;
    }
    
    for await (const url of myData) {
      const content = await scrapePage(url);
      const chunks = await splitter.splitText(content);
      for await (const chunk of chunks) {
        const result = await genAI.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });
  
        const vector = result.data[0].embedding;
  
        const res = await collection.insertOne({
          $vector: vector,
          text: chunk,
        });
        console.log(res);
      }
    }
};