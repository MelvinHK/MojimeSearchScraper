import axios from "axios";
import { load } from "cheerio";

import { BASE_URL } from "../config.js";
import "./types.js";

/**
 * Scrapes and returns an anime page's details.
 * 
 * @param {string} animeId The ID of an anime show.
 * @returns {Promise<AnimeDetails>} A promise of the anime's details.
 */
export const scrapeAnimeDetails = async (animeId) => {
  try {
    checkTypeError(animeId, 'string');

    const animeDetailsPage = await axios.get(`${BASE_URL}/category/${animeId}`);

    const $ = load(animeDetailsPage.data);

    const title = $('div.anime_info_body_bg > h1')
      .text()
      .trim();

    const otherNames = $('div.anime_info_body_bg > p.type.other-name')
      .find('a')
      .map((_index, element) => {
        const name = $(element).text().trim();
        if (name) return name;
      })
      .get();

    const subOrDub = title.includes('(Dub)') ? 'dub' : 'sub';

    return {
      id: animeId,
      title: title,
      subOrDub: subOrDub,
      otherNames: otherNames,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches the an episode ID's corresponding anime ID.
 * 
 * @param {string} episodeId The ID of an episode.
 * @returns {Promise<string>} A promise of the corresponding anime ID.
 * 
 * @example
 * async () => {
 *   const animeId = await fetchAnimeIdFromEpisodeId('naruto-episode-1');
 *   console.log(animeId); // 'naruto'
 * }
 */
export const fetchAnimeIdFromEpisodeId = async (episodeId) => {
  try {
    checkTypeError(episodeId, 'string');

    const res = await axios.get(`${BASE_URL}/${episodeId}`);
    const $ = load(res.data);

    return $('#wrapper_bg > section > section.content_left > div:nth-child(1) > div.anime_video_body > div.anime_video_body_cate > div.anime-info > a')
      .attr('href')
      .split('/')[2];
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the last section of a URL separated by '/'.
 * 
 * @param {string} url The URL to process.
 * @returns {string} The last section of the URL.
 * 
 * @example
 * getLastUrlSection('https://anitaku.pe/naruto-episode-1');
 * // returns 'naruto-episode-1'
 */
export const getLastUrlSection = (url) => {
  checkTypeError(url, 'string');

  const sections = url.split('/');
  return sections[sections.length - 1] || sections[sections.length - 2]; // - 2 In case url ends with '/'.
};

/**
 * @throws {TypeError}
 */
const checkTypeError = (checkedParam, type) => {
  if (typeof checkedParam !== type) {
    throw new TypeError(`The episodeId parameter must be of type ${type}.`);
  }
};