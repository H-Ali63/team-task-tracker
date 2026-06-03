const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = () => {
  let redisClient;

  // Render provides REDIS_URL as a full connection string
  // Local uses REDIS_HOST + REDIS_PORT separately
  const redisUrl =
    process.env.REDIS_URL ||          // Railway style
    process.env.REDIS_HOST ||         // Render style (full URL)
    null;

  const isFullUrl = redisUrl && redisUrl.startsWith('redis://');

  if (isFullUrl) {
    // Pass full URL directly as first argument — no config object
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) return null; // stop retrying after 10 attempts
        return Math.min(times * 200, 3000);
      },
      enableOfflineQueue: false,
    });
  } else {
    // Local development — use host/port
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(times * 200, 3000);
      },
      enableOfflineQueue: false,
    });
  }

  redisClient.on('connect', () => logger.info('Redis connected successfully'));
  redisClient.on('ready', () => logger.info('Redis ready'));
  redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  return redisClient;
};

// Singleton — only one client instance
let client;

const getRedisClient = () => {
  if (!client) {
    client = connectRedis();
  }
  return client;
};

// Call this once at app startup
const initRedis = () => {
  client = connectRedis();
  return client;
};

module.exports = { connectRedis: initRedis, getRedisClient };