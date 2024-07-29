import { load } from "cheerio";

import { fetchAnimeDetails, getLastUrlSection } from "./helpers.js";
import { BASE_URL, limit, axiosInstance } from "./config.js";

/**
 * @overview Scrapes GoGoAnime's entire anime-list. 
 * Duration depends on concurrency limit set in "./config.js".
 * Intended to run locally.
 * 
 * @typedef {import('./models.js').AnimeDetails} AnimeDetails
 */

/**
 * Recursively scrapes all anime list pages for all anime details. 
 * After a specified batch-size is reached, a callback may be performed with the batch.
 * 
 * @template T
 * @param {function(AnimeDetails[]): (Promise<T> | void)} callback - Callback once `batchSize` is reached.
 * @param {number} batchSize - Threshold for the number of items per batch.
 * @param {number} pageNumber - The page number to start on. Defaults to `1`. 
 * @param {AnimeDetails[]} currentBatch - The currently collected items during recursion. Leave as default.
 * @returns {Promise<AnimeDetails[]>}
 * 
 * @example
 * async () => {
 *   await scrapePage((batch) => { 
 *     // Do something after 100 in batch. 
 *   }, 100);
 * }
 * 
 * @see {@link limit} for the concurrency limit of scraping anime details.
 */
export const scrapePage = async (callback, batchSize, pageNumber = 1, currentBatch = []) => {
  try {
    console.log(`\nScraping page ${pageNumber}...`);

    const listPage = await axiosInstance.get(`${BASE_URL}/anime-list.html?page=${pageNumber}`);
    const $ = load(listPage.data);

    const hasNextPage = $("div.anime_name.anime_list > div > div > ul > li.selected")
      .next()
      .length > 0;

    const currentPageItems = await Promise.all(
      $("section.content_left > div > div.anime_list_body > ul")
        .children()
        .map(async (_index, item) => {
          const animeUrl = $(item).find("a").attr("href");
          const animeId = getLastUrlSection(animeUrl); // Will throw TypeError if animeUrl is undefined.
          return await limit(() => fetchAnimeDetails(animeId));
        })
        .get()
    );

    console.log("Done!");

    for (const item of currentPageItems) {
      currentBatch.push(item);

      if (currentBatch.length >= batchSize) {
        await callback(currentBatch);
        currentBatch = [];
      }
    }

    if (hasNextPage) {
      return scrapePage(callback, batchSize, pageNumber + 1, currentBatch);
    }

    if (currentBatch.length > 0) { // Handle remaining items on last page.
      await callback(currentBatch);
    }

    return currentBatch;

  } catch (error) {
    if (error instanceof TypeError) {
      console.log(
        "TypeError: animeUrl is undefined; it was unable to be scraped. " +
        "It may be due to a network issue, or because the website layout has changed."
      );
    } else {
      console.log(error);
    }
    return [];
  }
};