const main = async () => {
  await scrapePage(1, 500, (batch) => {
    console.log("Batch processed.", batch[0], batch[batch.length - 1]);
  });
};

main();