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
 * @param {number} page The page number to start on.
 * @param {function(AnimeDetails[]): void} callback
 * @param {AnimeDetails[]} animeList
 * @returns {Promise<AnimeDetails[]>}
 */
const scrapePage = async (page, callback = (batch) => { }, animeList = []) => {
  const response = await axios.get(`${BASE_URL}/anime-list.html?page=${page}`);
  const $ = load(response.data);

  const hasNextPage = $("div.anime_name.anime_list > div > div > ul > li.selected")
    .next()
    .length > 0;

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

  }

  return animeList;
};

(async () => {
  const list = await scrapePage(1, (batch) => {
    console.log("Batch processed:", batch.length, "items");
  });
  console.log(list);
})();