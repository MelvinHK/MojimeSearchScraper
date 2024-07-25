import axios from "axios";
import { load } from "cheerio";

import { scrapeAnimeDetails, getLastUrlSection } from "./helpers.js";
import { BASE_URL } from "./config.js";
import "./types.js";

/**
 * Recursively scrapes all anime list pages for all anime details. 
 * After a specified batch-size threshold is exceeded, a callback may be performed with the batch.
 * 
 * @param {number} page - The page number to start on.
 * @param {number} BATCH_THRESHOLD
 * @param {function(AnimeDetails[]): void} callback - Callback once BATCH_THRESHOLD is exceeded.
 * @param {AnimeDetails[]} currentBatch - The currently collected items during recursion. Leave as default.
 * @returns {Promise<AnimeDetails[]>}
 * 
 * @example
 * async () => {
 *   await scrapePage(1, 100, (batch) => { 
 *     // Do something after 100 in batch. 
 *   });
 * }
 */
export const scrapePage = async (page, BATCH_THRESHOLD, callback, currentBatch = []) => {
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
      return scrapePage(page + 1, BATCH_THRESHOLD, callback, currentBatch);
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