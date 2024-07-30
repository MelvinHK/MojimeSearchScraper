/**
 * @typedef {Object} AnimeDetails - MongoDB document structure for anime details.
 * 
 * @property {string} animeId - The ID of the anime.
 * @property {string} title - The title of the anime.
 * @property {'dub' | 'sub'} subOrDub - Indicates whether the anime is subbed or dubbed.
 * @property {string[]} otherNames - Other names for the anime.
 */

/**
 * @typedef {Object} MostRecentEpisode - MongoDB document structure for most recent episode released.
 * 
 * @property {string} episodeId - The ID of the episode.
 * @property {number} languageOption
 */

/**
 * The recent releases are split into three subtitle/language-option pages.
 * 
 * @enum {number}
 */
export const LanguageOptions = Object.freeze({
  englishSub: 1,
  englishDub: 2,
  chinese: 3
});