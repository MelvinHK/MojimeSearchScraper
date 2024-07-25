import axios from "axios";
import { load } from "cheerio";

import { scrapeAnimeDetails, getLastUrlSection } from "./helpers.js";
import { BASE_URL } from "./config.js";
import "./types.js";

/**
 * Recursively scrapes all anime list pages for all anime details. 
 * After a specified batch-size threshold is exceeded, a callback may be performed with the batch.
 * 
 * @param {function(AnimeDetails[]): void} callback - Callback once BATCH_THRESHOLD is exceeded.
 * @param {number} BATCH_THRESHOLD - Threshold for the number of items per batch.
 * @param {number} page - The page number to start on. Defaults to 1. 
 * @param {AnimeDetails[]} currentBatch - The currently collected items during recursion. Leave as default.
 * @returns {Promise<AnimeDetails[]>}
 * 
 * @example
 * async () => {
 *   await scrapePage((batch) => { 
 *     // Do something after 100 in batch. 
 *   }, 100);
 * }
 */
export const scrapePage = async (callback, BATCH_THRESHOLD, page = 1, currentBatch = []) => {
  try {
    const response = await axios.get(`${BASE_URL}/anime-list.html?page=${page}`);
    const $ = load(response.data);

    const hasNextPage = $("div.anime_name.anime_list > div > div > ul > li.selected")
      .next()
      .length > 0;

    const currentPageItems = await Promise.all(
      $("section.content_left > div > div.anime_list_body > ul")
        .children()
        .map(async (_index, anime) => {
          const animeUrl = $(anime).find("a").attr("href");
          const animeId = getLastUrlSection(animeUrl); // Will throw TypeError if animeUrl is undefined.
          return await scrapeAnimeDetails(animeId);
        })
        .get()
    );

    currentBatch = currentBatch.concat(currentPageItems);

    if (currentBatch.length >= BATCH_THRESHOLD) {
      callback(currentBatch);
      currentBatch = [];
    }

    if (hasNextPage) {
      return scrapePage(callback, BATCH_THRESHOLD, page + 1, currentBatch);
    }

    if (currentBatch.length > 0) { // Handle remaining items on last page.
      callback(currentBatch);
    }

    return currentBatch;

  } catch (error) {
    if (error instanceof TypeError) {
      console.log(
        "TypeError: animeUrl is undefined; it was unable to be scraped. " +
        "It may be due to a network issue, or because the website layout has changed."
      );
    } else {
      console.log("Error:", error);
    }
    return [];
  }
};