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
    console.log("Exhibit created, syncing to AstraDB...");

    try {
      const entity = await strapi.entityService.findOne('api::exhibit.exhibit', id, {
        populate: ['category_artifact']
      });

      console.log(`Entity data: ${JSON.stringify(entity)}`);
      await syncToAstraDB(entity, 'exhibits_collection', Number(id), 'exhibit');
      console.log("Sync completed");
    } catch (error) {
      console.error('Error syncing to AstraDB after create:', error);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    const { id } = result;
    console.log("Exhibit updated, syncing to AstraDB...");

    try {
      const entity = await strapi.entityService.findOne('api::exhibit.exhibit', id, {
        populate: ['category_artifact']
      });

      console.log(`Entity data: ${JSON.stringify(entity)}`);
      await syncToAstraDB(entity, 'exhibits_collection', Number(id), 'exhibit');
      console.log("Sync completed");
    } catch (error) {
      console.error('Error syncing to AstraDB after update:', error);
    }
  },

  async beforeDelete(event) {
    const { params } = event;
    const { where } = params;
    console.log("Preparing to delete exhibit...");
    
    if (where?.id) {
      const exhibitToDelete = await strapi.entityService.findOne('api::exhibit.exhibit', where.id);
      if (exhibitToDelete) {
        event.state = { exhibitId: Number(exhibitToDelete.id) };
      }
    }
  },

  async afterDelete(event) {
    const { state } = event;
    if (state?.exhibitId) {
      console.log("Exhibit deleted, removing from AstraDB...");
      try {
        await removeFromAstraDB('exhibits_collection', state.exhibitId, 'exhibit');
        console.log("Exhibit removed from AstraDB");
      } catch (error) {
        console.error('Error removing from AstraDB after delete:', error);
      }
    }
  }
}; 