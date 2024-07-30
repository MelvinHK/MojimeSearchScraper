import { collNames } from "./config.js";
import { bulkUpsert } from "./helpers/mongoDB.js";
import { scrapePage } from "./scrapeAnimeList.js";

/**
 * @overview This file runs via `npm start`; main() is executed and scrapes GoGo's entire anime-list.
 */

let totalProcessed = 0;
let batchNo = 1;

const main = async () => {
  const startTime = performance.now();
  console.log("Starting full anime-list scrape...");

  await scrapePage(async (batch) => {
    console.log("\nBatch size reached, processing...");

    await bulkUpsert(batch, "animeId", collNames.animeDetails);

    logBatch(batch);
  }, 500);

  const endTime = performance.now();
  console.log(`\nScrape completed. Duration (hh:mm:ss): ${formatTimestamp(endTime - startTime)}`);
};

const logBatch = (batch) => {
  console.log(
    `\nBatch ${batchNo++} processed:`,
    '\nFirst item:', batch[0],
    '\nLast item:', batch[batch.length - 1],
    "\nTotal processed:", totalProcessed += batch.length
  );
};

const formatTimestamp = (elapsedMs) => {
  const elapsedS = Math.floor(elapsedMs / 1000);

  const hours = String(Math.floor(elapsedS / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsedS % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsedS % 60).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

main();