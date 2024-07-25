import { scrapePage } from "./scrapeAnimeList.js";

let totalProcessed = 0;

const main = async () => {
  console.log("Starting full anime list scrape...");

  await scrapePage((batch) => {
    console.log(
      'Batch processed:\nFirst item:',
      batch[0],
      '\nLast item:',
      batch[batch.length - 1]
    );
    console.log("Total processed:", totalProcessed += batch.length);
  }, 500);
};

main();