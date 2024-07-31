import axios from 'axios';
import axiosRetry from 'axios-retry';
import pLimit from "p-limit";

import { MongoClient } from 'mongodb';
import 'dotenv/config';

export const BASE_URL = 'https://anitaku.pe';
export const AJAX_URL = 'https://ajax.gogocdn.net/ajax';

export const axiosInstance = axios.create();
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay
});

export const limit = pLimit(10); // Concurrency limit in very large Promise.all()'s.

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in the environment variables.");
}

export const mongoClient = new MongoClient(uri);
export const dbName = "MojimeDB";
export const collNames = Object.freeze({
  AnimeDetails: "AnimeDetails",
  MostRecentEpisodeIds: "MostRecentEpisodeIds"
});