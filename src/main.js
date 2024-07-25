import { scrapePage } from "./scrapeAnimeList.js";

let totalProcessed = 0;
let batchNo = 1;

const main = async () => {

  const startTime = performance.now();
  console.log("Starting full anime-list scrape...");

  await scrapePage((batch) => {
    logProgress(batch);
  }, 500);

  const endTime = performance.now();
  console.log(`Scrape completed. Duration (hh:mm:ss): ${formatTimestamp(endTime - startTime)}`);
};

const logProgress = (batch) => {
  console.log(
    `Batch ${batchNo++} processed:`,
    '\nFirst item:', batch[0],
    '\nLast item:', batch[batch.length - 1],
    "\nTotal processed:", totalProcessed += batch.length,
    "\n"
  );
};

const formatTimestamp = (elapsedMs) => {
  const seconds = Math.floor(elapsedMs / 1000);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return `${hours}:${minutes}:${secs}`;
};

main();