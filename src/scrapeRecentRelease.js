import { load } from "cheerio";
import { Collection, Document } from "mongodb";

import {
  fetchAnimeDetails,
  getLastUrlSection,
  fetchAnimeIdFromEpisodeId
} from "./helpers.js";
import {
  AJAX_URL,
  limit,
  axiosInstance,
  mongoClient,
  dbName,
  collNames
} from "./config.js";
import "./models.js";

/**
 * @overview This file contains functions to scrape GoGoAnime's recent release pages.
 */

/**
 * The initialization function, intended to run server-side; schedule every hour.
 */
const checkAndScrapeRecents = async () => {
  const collection = mongoClient
    .db(dbName)
    .collection(collNames.mostRecentEpisodeId);

  for (const languageOption of Object.values(LanguageOptions)) {
    try {
      const [previous, current] = await Promise.all([
        getPreviousMostRecentEpId(languageOption, collection),
        fetchCurrentMostRecentEpId(languageOption)
      ]);

      if (previous !== current) {
        const recentAnime = await scrapeRecents(previous, languageOption);

        // Bulk write upsert to MongoDB
      } else {
        console.log(`No new updates found for language option ${languageOption}.`);
      }
    } catch (error) {
      console.log(`Error for language option ${languageOption}:`, error);
    }
  }
};

/**
 * 
 * @param {Collection<Document>} collection - A MongoDB collection holding MostRecentEpisodeId objects.
 * @param {number} languageOption
 * @returns {Promise<string>} A promise returning the database's most recent episode ID.
 * 
 * @see LanguageOptions in ./models.js.
 * @see MostRecentEpisodeId in ./models.js
 */
const getPreviousMostRecentEpId = async (collection, languageOption) => {
  try {
    return await collection.findOne({ languageOption: languageOption }).then(res => res.episodeId);
  } catch (error) {
    console.log("Error getting");
    throw error;
  }
};

/**
 * Scrapes the most recent episode ID.
 * 
 * @param {number} languageOption
 * @returns {Promise<string>} A promise returning the most recent episode ID.
 * 
 * @see LanguageOptions in ./models.js.
 */
const fetchCurrentMostRecentEpId = async (languageOption) => {
  try {
    const recentsPage = await axiosInstance.get(
      `${AJAX_URL}/page-recent-release.html?page=1&type=${languageOption}`
    );
    const $ = load(recentsPage.data);

    const mostRecentEpisodeUrl = $("ul.items")
      .children()
      .first()
      .find("a")
      .attr("href");

    return getLastUrlSection(mostRecentEpisodeUrl);

  } catch (error) {
    throw error;
  }
};

/**
 * Recursively scrapes the recent release pages until a sentinel episode ID is reached, 
 * or until a page limit is reached.
 * 
 * @param {string} sentinelEpisodeId - The episode ID to scrape until.
 * @param {number} languageOption
 * @param {number} pageNumber - The page number to start on. Defaults to `1`.
 * @param {number} pageLimit - The max number of pages to scrape. Defaults to `5`.
 * @returns {Promise<AnimeDetails[]>} Returns all scraped anime details up until the previous most recent episode ID/page limit.
 * 
 * @see LanguageOptions in ./models.js.
 */
const scrapeRecents = async (sentinelEpisodeId, languageOption, pageNumber = 1, pageLimit = 5) => {
  try {
    const recentsPage = await axiosInstance.get(
      `${AJAX_URL}/page-recent-release.html?page=${pageNumber}&type=${languageOption}`
    );
    const $ = load(recentsPage.data);

    const hasNextPage = $("ul.pagination-list > li.selected")
      .next()
      .length > 0;

    const episodeIds = $("div.last_episodes.loaddub > ul")
      .children()
      .map((_index, element) => {
        const episodeUrl = $(element).find("a").attr("href");
        return getLastUrlSection(episodeUrl); // Will throw TypeError if episodeUrl is undefined.
      })
      .get();

    const indexOfSentinel = episodeIds.indexOf(sentinelEpisodeId);

    const currentPageItems = await Promise.all(
      episodeIds.slice(0, indexOfSentinel !== -1 ? indexOfSentinel : undefined)
        .map(async (episodeId) => {
          const animeId = await limit(() => fetchAnimeIdFromEpisodeId(episodeId));
          return await limit(() => fetchAnimeDetails(animeId));
        })
    );

    if (indexOfSentinel !== -1 || pageNumber == pageLimit || !hasNextPage) {
      return currentPageItems;
    }

    const nextPageItems = await scrapeRecents(sentinelEpisodeId, languageOption, pageNumber + 1);

    return currentPageItems.concat(nextPageItems);

  } catch (error) {
    console.error(`Error on page ${pageNumber} for language option ${languageOption}:`);
    throw error;
  }
};