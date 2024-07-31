import { load } from "cheerio";

import { BASE_URL, axiosInstance } from "../config.js";
import { AnimeDetails } from "../models.js";

/**
 * Scrapes and returns an anime's page details.
 */
export const fetchAnimeDetails = async (animeId: string): Promise<AnimeDetails> => {
  try {
    const animeDetailsPage = await axiosInstance.get(`${BASE_URL}/category/${animeId}`);

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
      animeId: animeId,
      title: title,
      subOrDub: subOrDub,
      otherNames: otherNames,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Fetches the episode ID's corresponding anime ID.
 * 
 * @example
 * async () => {
 *   const animeId = await fetchAnimeIdFromEpisodeId('naruto-episode-1');
 *   console.log(animeId); // 'naruto'
 * }
 */
export const fetchAnimeIdFromEpisodeId = async (episodeId: string): Promise<string> => {
  try {
    const episodePage = await axiosInstance.get(`${BASE_URL}/${episodeId}`);
    const $ = load(episodePage.data);

    const animeUrl = $(
      '#wrapper_bg > section > section.content_left > div:nth-child(1) > div.anime_video_body > div.anime_video_body_cate > div.anime-info > a'
    ).attr('href');

    return getLastUrlSection(animeUrl);
  } catch (error) {
    throw error;
  }
};

/**
 * Gets the last section of a URL separated by '/'.
 * Will throw an error if the url is undefined, intended to terminate recursion functions.
 *
 * @example
 * getLastUrlSection('https://anitaku.pe/naruto-episode-1');
 * // returns 'naruto-episode-1'
 */
export const getLastUrlSection = (url: string | undefined): string => {
  if (!url) {
    throw new Error("Error: URL is undefined; could not get last section.");
  }

  const sections = url.split('/');
  return sections[sections.length - 1] || sections[sections.length - 2]; // - 2 In case url ends with '/'.
};