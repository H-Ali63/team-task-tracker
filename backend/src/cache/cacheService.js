const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TTL = parseInt(process.env.CACHE_TTL, 10) || 300; // 5 minutes default

/**
 * Structured cache key builders.
 * Using a clear namespace pattern: entity:scope:identifier
 */
const CacheKeys = {
  tasksByAssignee: (orgId, assigneeId) =>
    `tasks:org:${orgId}:assignee:${assigneeId}`,
  tasksByOrg: (orgId, queryHash) =>
    `tasks:org:${orgId}:query:${queryHash}`,
  taskById: (taskId) => `task:${taskId}`,
  userById: (userId) => `user:${userId}`,
};

/**
 * Generates a simple hash string from filter/query params for use in cache keys.
 */
const buildQueryHash = (params) => {
  return Buffer.from(JSON.stringify(params)).toString('base64').substring(0, 32);
};

const cacheService = {
  /**
   * Get a value from cache. Returns parsed JSON or null.
   */
  async get(key) {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      logger.error(`Cache GET error for key "${key}": ${err.message}`);
      return null; // Graceful degradation — always fall through to DB on cache error
    }
  },

  /**
   * Set a value in cache with optional TTL (seconds).
   */
  async set(key, value, ttl = CACHE_TTL) {
    try {
      const client = getRedisClient();
      await client.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      logger.error(`Cache SET error for key "${key}": ${err.message}`);
      // Don't throw — caching is non-critical
    }
  },

  /**
   * Delete a specific cache key.
   */
  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (err) {
      logger.error(`Cache DEL error for key "${key}": ${err.message}`);
    }
  },

  /**
   * Delete all keys matching a pattern.
   * Used for cache invalidation when a task changes that affects multiple queries.
   */
  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
        logger.debug(`Cache invalidated ${keys.length} keys for pattern: ${pattern}`);
      }
    } catch (err) {
      logger.error(`Cache DEL pattern error for "${pattern}": ${err.message}`);
    }
  },

  /**
   * Invalidate all task caches for a given organization.
   * Called on create/update/delete to keep data consistent.
   */
  async invalidateTaskCaches(orgId, assigneeId = null) {
    // Invalidate all org-level task queries
    await this.delPattern(`tasks:org:${orgId}:*`);
    // Also invalidate individual assignee cache if provided
    if (assigneeId) {
      await this.del(CacheKeys.tasksByAssignee(orgId, assigneeId));
    }
  },
};

module.exports = { cacheService, CacheKeys, buildQueryHash };
