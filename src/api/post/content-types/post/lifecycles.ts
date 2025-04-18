import { syncToAstraDB, removeFromAstraDB } from '../../../../services/astradb-sync';
import type Strapi from '@strapi/strapi';

declare module '@strapi/strapi' {
  export interface Strapi {
    entityService: any;
  }
}

export default {
  async afterCreate(event) {
    const { result } = event;
    const { id } = result;
    console.log("Post created, syncing to AstraDB...");

    try {
      const entity = await strapi.entityService.findOne('api::post.post', id, {
        populate: ['category']
      });

      console.log(`Entity data: ${JSON.stringify(entity)}`);
      await syncToAstraDB(entity, 'posts_collection', Number(id), 'post');
      console.log("Sync completed");
    } catch (error) {
      console.error('Error syncing to AstraDB after create:', error);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    const { id } = result;
    console.log("Post updated, syncing to AstraDB...");

    try {
      const entity = await strapi.entityService.findOne('api::post.post', id, {
        populate: ['category']
      });

      console.log(`Entity data: ${JSON.stringify(entity)}`);
      await syncToAstraDB(entity, 'posts_collection', Number(id), 'post');
      console.log("Sync completed");
    } catch (error) {
      console.error('Error syncing to AstraDB after update:', error);
    }
  },

  async beforeDelete(event) {
    const { params } = event;
    const { where } = params;
    console.log("Preparing to delete post...");
    
    if (where?.id) {
      const postToDelete = await strapi.entityService.findOne('api::post.post', where.id);
      if (postToDelete) {
        event.state = { postId: Number(postToDelete.id) };
      }
    }
  },

  async afterDelete(event) {
    const { state } = event;
    if (state?.postId) {
      console.log("Post deleted, removing from AstraDB...");
      try {
        await removeFromAstraDB('posts_collection', state.postId, 'post');
        console.log("Post removed from AstraDB");
      } catch (error) {
        console.error('Error removing from AstraDB after delete:', error);
      }
    }
  }
}; 