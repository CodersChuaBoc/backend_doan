// import type { Core } from '@strapi/strapi';
import { connectToDatabase, checkOrCreateCollection, loadSampleData } from './services/astradb';
export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {
    try {
      const db = connectToDatabase();
      await checkOrCreateCollection(db, "posts_collection");
      await loadSampleData(db, "posts_collection");
    } catch (error) {
      console.error("Error in bootstrap:", error);
    }
  },
};
