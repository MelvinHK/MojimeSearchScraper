import axios from 'axios';
import axiosRetry from 'axios-retry';
import pLimit from "p-limit";

export const BASE_URL = 'https://anitaku.pe';
export const AJAX_URL = 'https://ajax.gogocdn.net/ajax';

export const axiosInstance = axios.create();
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay
});

export const limit = pLimit(10); // Concurrency limit in Promise.all().
