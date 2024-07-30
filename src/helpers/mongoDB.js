import { Filter, Document, WithId, BulkWriteResult } from "mongodb";

import { collNames, dbName, mongoClient } from "../config.js";

/**
 * @param {AnimeDetails[]} documents - The array of AnimeDetails to upsert.
 * @param {string} uniqueField - The unique field to identify documents.
 * @param {string} collectionName - The name of the collection to write to.
 * @returns {Promise<BulkWriteResult>} The result of the bulk write operation.
 */
export const bulkUpsert = async (documents, uniqueField, collectionName) => {
  if (!collNames[collectionName]) {
    throw new Error(
      `Bulk upsert failed: Collection "${collectionName}" does not exist. Check collNames "./config.js".`
    );
  }

  const collection = mongoClient
    .db(dbName)
    .collection(collectionName);

  const bulkOperations = documents.map(doc => ({
    updateOne: {
      filter: { [uniqueField]: doc[uniqueField] },
      update: { $set: doc },
      upsert: true
    }
  }));

  try {
    return await collection.bulkWrite(bulkOperations);
  } catch (error) {
    console.error('Bulk upsert failed:');
    throw error;
  }
};

/** 
 * @param {string} collectionName
 * @param {Filter<Document>} filter
 * @returns {Promise<WithId<Document> | null>}
 */
export const getDocument = async (collectionName, filter = {}) => {
  const collection = mongoClient
    .db(dbName)
    .collection(collectionName);

  try {
    return await collection.findOne(filter);
  } catch (error) {
    console.log(`MongoDB Error: Could not get document from ${collectionName}.`);
    throw error;
  }
};

/**
 * @template T
 * @param {string} collectionName
 * @param {Filter<Document>} filter
 * @param {string} fieldName
 * @param {T} fieldValue
 * @returns {Promise<void>}
 */
export const updateDocument = async (collectionName, filter, fieldName, fieldValue) => {
  try {
    const collection = mongoClient
      .db(dbName)
      .collection(collectionName);

    await collection.updateOne(filter, {
      $set: {
        [fieldName]: fieldValue
      }
    });
  } catch (error) {
    console.log(`Update Error: Could not update document in ${collectionName}.`);
    throw error;
  }
};