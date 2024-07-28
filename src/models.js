/**
 * @typedef {Object} AnimeDetails
 * 
 * @property {string} id - The ID of the anime.
 * @property {string} title - The title of the anime.
 * @property {'dub' | 'sub'} subOrDub - Indicates whether the anime is subbed or dubbed.
 * @property {string[]} otherNames - Other names for the anime.
 */

/**
 * @typedef {Object} MostRecentEpisodeId
 * 
 * @property {string} episodeId - The ID of the episode.
 * @property {number} languageOption
 * 
 * @see LanguageOptions
 */

/**
 * The recent release page's anime language/subtitle url parameter options.
 * 
 * @enum {number}
 */
const LanguageOptions = Object.freeze({
  englishSub: 1,
  englishDub: 2,
  chinese: 3
});