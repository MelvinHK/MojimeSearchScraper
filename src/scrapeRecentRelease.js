import { load } from "cheerio";

import {
  scrapeAnimeDetails,
  getLastUrlSection,
  fetchAnimeIdFromEpisodeId
} from "./helpers.js";
import { AJAX_URL, limit, axiosInstance } from "./config.js";
import "./types.js";

/**
 * @overview Scrapes GoGoAnime's recent release pages.
 * Intended to run server-side; schedule every hour.
 */

const monitorChanges = () => {
  // Get page content
  // Convert to hash
  // Compare with a previous hash
  // Change detected if hashes dont match
}

const scrapeRecents = (callback, BATCH_THRESHOLD, page) => {

}