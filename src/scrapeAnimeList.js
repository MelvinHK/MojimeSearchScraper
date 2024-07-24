import axios from "axios";
import { load } from "cheerio";

import { scrapeAnimeDetails } from "./helpers.js";
import { BASE_URL } from "../config.js";
import "./types.js";

/**
 * @fileoverview This file contains functions for scraping the entirety of GoGoAnime's anime-list pages.
 */

/**
 * Recursively scrapes all anime list pages for all anime details.
 * 
 * @param {number} page - The page number to start on.
 * @param {number} BATCH_THRESHOLD - The batch size limit.
 * @param {function(AnimeDetails[]): void} callback - Callback once BATCH_THRESHOLD is exceeded.
 * @param {AnimeDetails[]} [scrapedList=[]] - The currently collected items during recursion. Leave as default.
 * @returns {Promise<AnimeDetails[]>}
 */
const scrapePage = async (page, BATCH_THRESHOLD, callback, scrapedList = []) => {
  const response = await axios.get(`${BASE_URL}/anime-list.html?page=${page}`);
  const $ = load(response.data);

  const hasNextPage = $("div.anime_name.anime_list > div > div > ul > li.selected")
    .next()
    .length > 0;

  const currentPageItems = await Promise.all(
    $("section.content_left > div > div.anime_list_body > ul")
      .children()
      .map(async (_index, anime) => {
        const animeId = $(anime).find("a").attr("href")?.split("/")[2];
        if (animeId) {
          return await scrapeAnimeDetails(animeId);
        }
      })
      .get()
  );

  scrapedList = scrapedList.concat(currentPageItems);

  if (scrapedList.length >= BATCH_THRESHOLD) {
    callback(scrapedList);
    scrapedList = [];
  }

  if (hasNextPage) {
    return scrapePage(page + 1, BATCH_THRESHOLD, callback, scrapedList);
  } else {
    if (scrapedList.length > 0) { // Handle remaining items on last page.
      callback(scrapedList);
    }
    return scrapedList;
  }
};

(async () => {
  await scrapePage(1, 500, (batch) => {
    console.log("Batch processed.", batch[0], batch[batch.length - 1]);
  });
})();