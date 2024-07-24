import axios from "axios";
import { load } from "cheerio";
import config from "../config.js";
import { scrapeAnimeDetails } from "./helpers.js";

const BASE_URL = config.BASE_URL;

/**
 * Recursively scrapes all anime list's pages for all anime details, 
 * performing a callback once the number of anime details exceeds a batch limit.
 * 
 * @param {number} page The page number to start on.
 * @param {number} batchSize The maximum number of anime details scraped before performing callback.
 * @param {function(Array): void} [callBack] Callback once batch number is exceeded.
 * 
 * @returns 
 */
const scrapePage = async (page, batchSize, callBack = async (animeListBatch) => { }) => {
  const url = `${BASE_URL}/anime-list.html?page=${page}`;

  const html = await axios.get(url);
  const $ = load(html.data);

  const hasNextPage = $("div.anime_name.anime_list > div > div > ul > li.selected").next().length > 0;

  const animeList = await Promise.all(
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

  if (hasNextPage) {
    const nextPageList = await scrapePage(page + 1, batchSize);
    return animeList.concat(nextPageList);
  }

  return animeList;
};

(async () => {
  const list = await scrapePage(1, 40, async (animeListBatch) => {
    console.log('Batch: ', animeListBatch.length);
  });
  console.log(list.length);
})();