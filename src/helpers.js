import { load } from "cheerio";

import { BASE_URL, axiosInstance, dbName, mongoClient } from "./config.js";
import { BulkWriteResult } from "mongodb";

/**
 * @typedef {import('./models.js').AnimeDetails} AnimeDetails
 */

/**
 * Scrapes and returns an anime's page details.
 * 
 * @param {string} animeId - The ID of an anime.
 * @returns {Promise<AnimeDetails>} A promise of the anime's details.
 */
export const fetchAnimeDetails = async (animeId) => {
  try {
    checkTypeError(animeId, 'string');

    const animeDetailsPage = await axiosInstance.get(`${BASE_URL}/category/${animeId}`);

    const $ = load(animeDetailsPage.data);

    const title = $('div.anime_info_body_bg > h1')
      .text()
      .trim();

    const otherNames = $('div.anime_info_body_bg > p.type.other-name')
      .find('a')
      .map((_index, element) => {
        const name = $(element).text().trim();
        if (name) return name;
      })
      .get();

    const subOrDub = title.includes('(Dub)') ? 'dub' : 'sub';

    return {
      animeId: animeId,
      title: title,
      subOrDub: subOrDub,
      otherNames: otherNames,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches the episode ID's corresponding anime ID.
 * 
 * @param {string} episodeId - The ID of an episode.
 * @returns {Promise<string>} A promise of the corresponding anime ID.
 * 
 * @example
 * async () => {
 *   const animeId = await fetchAnimeIdFromEpisodeId('naruto-episode-1');
 *   console.log(animeId); // 'naruto'
 * }
 */
export const fetchAnimeIdFromEpisodeId = async (episodeId) => {
  try {
    checkTypeError(episodeId, 'string');

    const episodePage = await axiosInstance.get(`${BASE_URL}/${episodeId}`);
    const $ = load(episodePage.data);

    const animeUrl = $(
      '#wrapper_bg > section > section.content_left > div:nth-child(1) > div.anime_video_body > div.anime_video_body_cate > div.anime-info > a'
    ).attr('href');

    return getLastUrlSection(animeUrl);
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the last section of a URL separated by '/'.
 * 
 * @param {string} url - The URL to process.
 * @returns {string} The last section of the URL.
 * 
 * @example
 * getLastUrlSection('https://anitaku.pe/naruto-episode-1');
 * // returns 'naruto-episode-1'
 */
export const getLastUrlSection = (url) => {
  checkTypeError(url, 'string');

  const sections = url.split('/');
  return sections[sections.length - 1] || sections[sections.length - 2]; // - 2 In case url ends with '/'.
};

/**
 * @template T
 * @param {T[]} documents - The array of documents to upsert.
 * @param {string} uniqueField - The unique field to identify documents.
 * @param {string} collectionName - The name of the collection to write to.
 * @returns {Promise<BulkWriteResult>} The result of the bulk write operation.
 */
export const bulkUpsert = async (documents, uniqueField, collectionName) => {
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
 * @throws {TypeError}
 */
const checkTypeError = (checkedParam, type) => {
  if (typeof checkedParam !== type) {
    throw new TypeError(`The ${checkedParam} parameter must be of type ${type}.`);
  }
};