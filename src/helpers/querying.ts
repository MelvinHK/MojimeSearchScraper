import { BulkWriteResult, Document, Filter, WithId } from "mongodb";
import { collNames, dbName, mongoClient } from "../config";
import { AnimeDetails, CollectionName } from "../models";

/**
 * @param {AnimeDetails[]} documents - The array of AnimeDetails to upsert.
 * @param {string} uniqueField - The unique field to identify documents.
 * @param {string} collectionName - The name of the collection to write to.
 * @returns {Promise<BulkWriteResult>} The result of the bulk write operation.
 */
export const bulkUpsert = async <T extends keyof AnimeDetails>(
  documents: AnimeDetails[],
  uniqueField: T,
  collectionName: CollectionName
): Promise<BulkWriteResult> => {

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

export const getDocument = async (
  collectionName: CollectionName,
  filter: Filter<Document> = {}
): Promise<WithId<Document> | null> => {

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

export const updateDocument = async <T>(
  collectionName: string,
  filter: Filter<Document>,
  fieldName: string,
  fieldValue: T
): Promise<void> => {
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