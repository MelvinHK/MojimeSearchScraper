import { load } from "cheerio";

import {
  fetchAnimeDetails,
  getLastUrlSection,
  fetchAnimeIdFromEpisodeId,
} from "./helpers/scraping";
import {
  bulkUpsert,
  getDocument,
  updateDocument
} from "./helpers/mongoDB";
import {
  AJAX_URL,
  limit,
  axiosInstance,
  collNames
} from "./config";
import { AnimeDetails, LanguageOptions, MostRecentEpisode } from "./models";

/**
 * @overview This file scrapes GoGoAnime's recent release pages and is intended to be executed server-side every hour.
 */

/**
 * The initialization function. Checks for new episodes by comparing a most-recent episode in the database
 * with a scraped most-recent episode. The episodes are bulk upserted, where any new anime are inserted.
 * 
 * It's assumed that, for each option in the enum `LanguageOptions`, a most-recent episode exists in the database.
 * If not, they should be manually inserted following the `MostRecentEpisode` structure.
 * 
 * @see {@link LanguageOptions} 
 * @see {@link MostRecentEpisode}
 */
const checkAndScrapeRecents = async () => {
  for (const languageOption of Object.values(LanguageOptions)) {
    console.log(`Checking language ${languageOption}...`);
    try {
      const [dbEpisodeId, scrapedEpisodeId] = await Promise.all([
        getDocument(collNames.mostRecentEpisodeIds, { languageOption: languageOption })
          .then(res => res?.episodeId),
        scrapeMostRecentEpId(languageOption)
      ]);

      if (dbEpisodeId === scrapedEpisodeId) {
        console.log(`No new updates found for language ${languageOption}.`);
        continue;
      }

      console.log(`New episode(s) available for language ${languageOption}, processing...`);

      const recentAnime = await scrapeRecents(dbEpisodeId, languageOption);

      console.log(`Found ${recentAnime.length} new episode(s) for language ${languageOption}. Inserting any new anime...`);

      const [bulkUpsertResult, _] = await Promise.all([
        bulkUpsert(recentAnime, "animeId", collNames.animeDetails),
        updateDocument(
          collNames.mostRecentEpisodeIds,
          { languageOption: languageOption },
          "episodeId",
          scrapedEpisodeId
        )
      ]);

      const newAnimeCount = bulkUpsertResult.insertedCount;

      if (newAnimeCount > 0) {
        console.log(`Inserted ${newAnimeCount} new anime.`);
      } else {
        console.log(`No new anime were inserted.`);
      }
    } catch (error) {
      console.log(`Error for language ${languageOption}:`, error);
    }
  }
};

/**
 * Scrapes the most recent episode ID.
 * 
 * @param {number} languageOption
 * @returns {Promise<string>} A promise returning the most recent episode ID.
 * 
 * @see {@link LanguageOptions}
 */
const scrapeMostRecentEpId = async (languageOption: number): Promise<string> => {
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
 * Recursively scrapes the recent release pages until a sentinel episode ID is reached, 
 * or until a page limit is reached.
 * 
 * @see {@link LanguageOptions}
 */
const scrapeRecents = async (
  sentinelEpisodeId: string,
  languageOption: number,
  pageNumber: number = 1,
  pageLimit: number = 5
): Promise<AnimeDetails[]> => {
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

checkAndScrapeRecents();