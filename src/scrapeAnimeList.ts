import { load } from "cheerio";

import { fetchAnimeDetails, getLastUrlSection } from "./helpers/scraping";
import { bulkUpsert } from "./helpers/querying";
import { BASE_URL, limit, axiosInstance, collNames } from "./config.js";
import { AnimeDetails } from "./models";

/**
 * @overview This file scrapes GoGoAnime's entire anime-list and is intended to be executed locally. 
 * Duration depends on concurrency limit set in "./config.js".
 */

/**
 * The initialization function.
 */
const scrapeAnimeList = async () => {
  const startTime = performance.now();
  console.log("Starting full anime-list scrape...");

  await scrapePage(async (batch: AnimeDetails[]) => {
    console.log("\nBatch size reached, processing...");

    await bulkUpsert(batch, "animeId", collNames.animeDetails);

    logBatch(batch);
  }, 500);

  const endTime = performance.now();
  console.log(`\nScrape completed. Duration (hh:mm:ss): ${formatTimestamp(endTime - startTime)}`);
};

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
          const animeId = getLastUrlSection(animeUrl);  // Intentionally throws an error if animeUrl is undefined.
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

let batchNo = 1;
let totalProcessed = 0;
const logBatch = (batch: AnimeDetails[]) => {
  console.log(
    `\nBatch ${batchNo++} processed:`,
    '\nFirst item:', batch[0],
    '\nLast item:', batch[batch.length - 1],
    "\nTotal processed:", totalProcessed += batch.length
  );
};

const formatTimestamp = (elapsedMs: number) => {
  const elapsedS = Math.floor(elapsedMs / 1000);

  const hours = String(Math.floor(elapsedS / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsedS % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsedS % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

scrapeAnimeList();