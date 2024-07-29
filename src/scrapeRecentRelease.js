import { load } from "cheerio";

import {
  fetchAnimeDetails,
  getLastUrlSection,
  fetchAnimeIdFromEpisodeId,
  bulkUpsert
} from "./helpers.js";
import {
  AJAX_URL,
  limit,
  axiosInstance,
  mongoClient,
  dbName,
  collNames
} from "./config.js";
import { LanguageOptions } from "./models.js";

/**
 * @overview This file contains functions to scrape GoGoAnime's recent release pages.
 * 
 * @typedef {import('./models.js').AnimeDetails} AnimeDetails
 * @typedef {import('./models.js').MostRecentEpisode} MostRecentEpisode
 */

/**
 * The initialization function, intended to run server-side; schedule every hour.
 */
const checkAndScrapeRecents = async () => {
  const logNoUpdates = (languageOption) =>
    console.log(`No new updates found for language ${languageOption}.`);

  for (const languageOption of Object.values(LanguageOptions)) {
    console.log(`Checking language ${languageOption}...`);
    try {
      const [previousEpId, currentEpId] = await Promise.all([
        getPreviousMostRecentEpId(languageOption),
        fetchCurrentMostRecentEpId(languageOption)
      ]);

      if (previousEpId === currentEpId) {
        logNoUpdates(languageOption);
        continue;
      }

      console.log(`New episode(s) found for language ${languageOption}, processing...`);

      const recentAnime = await scrapeRecents(previousEpId, languageOption);

      console.log(`Found ${recentAnime.length} new episode(s) for language ${languageOption}.`);

      const [bulkUpsertResult, _] = await Promise.all([
        bulkUpsert(recentAnime, "animeId", collNames.animeDetails),
        updateMostRecentEpisode({
          episodeId: currentEpId,
          languageOption: languageOption
        })
      ]);

      const newAnimeCount = bulkUpsertResult.insertedCount;

      if (newAnimeCount > 0) {
        console.log(`Inserted ${newAnimeCount} new anime.`);
      } else {
        logNoUpdates(languageOption);
      }
    } catch (error) {
      console.log(`Error for language ${languageOption}:`, error);
    }
  }
};

/**
 * Gets the database's most recent episode ID.
 * 
 * @param {number} languageOption
 * @returns {Promise<string>} A promise returning the database's most recent episode ID.
 * 
 * @see LanguageOptions in ./models.js.
 */
const getPreviousMostRecentEpId = async (languageOption) => {
  const collection = mongoClient
    .db(dbName)
    .collection(collNames.mostRecentEpisodeIds);

  try {
    return await collection.findOne({ languageOption: languageOption }).then(res => res.episodeId);
  } catch (error) {
    console.log(`MongoDB Error: Could not get most recent episode ID.`);
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
    console.log(`Scraping Error: Could not scrape most recent episode ID.`);
    throw error;
  }
};
/**
 * Updates 
 * 
 * @param {MostRecentEpisode} episode - The new most recent episode.
 */
const updateMostRecentEpisode = async (episode) => {
  try {
    const collection = mongoClient
      .db(dbName)
      .collection(collNames.mostRecentEpisodeIds);

    await collection.updateOne({ languageOption: episode.languageOption }, {
      $set: {
        episodeId: episode.episodeId
      }
    });
  } catch (error) {
    console.log(`Update Error: Could not update most recent episode ID`);
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
 * @returns {Promise<AnimeDetails[]>} Returns all scraped anime details up until the sentinel episode ID/page limit.
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

    if (indexOfSentinel !== -1 || pageNumber >= pageLimit || !hasNextPage) {
      return currentPageItems;
    }

    const nextPageItems = await scrapeRecents(sentinelEpisodeId, languageOption, pageNumber + 1, pageLimit);

    return currentPageItems.concat(nextPageItems);

  } catch (error) {
    console.error(`Error on page ${pageNumber}:`);
    throw error;
  }
};