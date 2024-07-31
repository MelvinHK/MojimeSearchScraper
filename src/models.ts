import { collNames } from "./config";

/**
 * Valid collection names.
 * @see {@link collNames}
 */
export type CollectionName = (typeof collNames)[keyof typeof collNames];

/**
 * MongoDB document structure for anime details.
 */
export interface AnimeDetails {
  animeId: string;
  title: string;
  subOrDub: 'dub' | 'sub';
  otherNames: string[];
}

/**
 * MongoDB document structure for most recent episode released.
 */
export interface MostRecentEpisode {
  episodeId: string;
  languageOption: number;
}

/**
 * For recent releases, the anime are split into three subtitle/language-option pages.
 */
export const LanguageOptions = Object.freeze({
  englishSub: 1,
  englishDub: 2,
  chinese: 3
});