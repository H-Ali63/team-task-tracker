const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = () => {
  // Render provides a full REDIS_URL, local uses host/port
  const redisConfig = process.env.REDIS_HOST?.startsWith('redis://')
    ? process.env.REDIS_HOST  // full URL from Render
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      };

  redisClient = new Redis(redisConfig, {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));

  return redisClient;
};

const getRedisClient = () => {
  if (!redisClient) throw new Error('Redis not initialized');
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };