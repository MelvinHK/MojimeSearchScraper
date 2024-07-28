import { load } from "cheerio";

import {
  scrapeAnimeDetails,
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
import "./types.js";

const languageOptions = [1, 2, 3];

/**
 * @overview Scrapes GoGoAnime's recent release pages.
 * Intended to run server-side; schedule every hour.
 */

/**
 * Checks for new recent episodes by comparing the first item with the most recently scraped item.
 * 
 * @param {number} languageOption - The page's language/subtitle option. `1` = EN Sub, `2` = EN Dub, `3` = CN Dub.
 * @returns {Promise<boolean | undefined>} A boolean promise whether or not there's a new most recent in the page. 
 */
const isMostRecentNew = async (languageOption) => {
  try {
    const recentsPage = await axiosInstance.get(
      `${AJAX_URL}/page-recent-release.html?page=1&type=${languageOption}`
    );
    const $ = load(recentsPage.data);

    const currentMostRecentEpisodeId = $("ul.items")
      .children()
      .first()
      .find("a")
      .attr("href")
      .substring(1);

    const collection = mongoClient
      .db(dbName)
      .collection(collNames.mostRecentEpisodeId);

    const previousMostRecentEpisodeId = collection
      .findOne({})
      .then(res => res.episodeId);

    if (currentMostRecentEpisodeId !== previousMostRecentEpisodeId) {
      await collection.updateOne({}, {
        $set: {
          episodeId: currentMostRecentEpisodeId
        }
      });
      return true;
    } else {
      return false;
    };
  } catch (error) {
    throw error;
  }
};

const scrapeRecents = async (callback, batchSize, languageOption, page = 1) => {

};

const init = async () => {
  for (option of languageOptions) {
    try {
      if (isMostRecentNew(option)) {
        await scrapeRecents();
      }
    } catch (error) {
      console.log(`Error for language option ${option}:`, error);
    }
  }
};