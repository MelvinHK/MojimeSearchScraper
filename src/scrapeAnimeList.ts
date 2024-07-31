import { load } from "cheerio";

import { fetchAnimeDetails, getLastUrlSection } from "./helpers/scraping";
import { BASE_URL, limit, axiosInstance } from "./config.js";
import { AnimeDetails } from "./models";

/**
 * @overview Scrapes GoGoAnime's entire anime-list. 
 * Duration depends on concurrency limit set in "./config.js".
 * Intended to run locally.
 */

/**
 * Recursively scrapes all anime list pages for all anime details. 
 * After a specified batch-size is reached, a callback may be performed with the batch.
 * 
 * @see {@link limit} for the concurrency limit of scraping anime details.
 */
export const scrapePage = async <T>(
  callback: (batch: AnimeDetails[]) => Promise<T> | void,
  batchSize: number,
  pageNumber: number = 1,
  currentBatch: AnimeDetails[] = []
): Promise<AnimeDetails[]> => {
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
          const animeId = getLastUrlSection(animeUrl);
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
    console.log(error);
    return [];
  }
};