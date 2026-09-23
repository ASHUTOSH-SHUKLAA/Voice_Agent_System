const { createClient } = require('redis');

let client;
let connectPromise;
const memoryStore = new Map();

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

function initRawRedisClient() {
  if (!client) {
    const url = getRedisUrl();
    const isTls = url.startsWith('rediss://');

    client = createClient({
      url,
      socket: isTls
        ? {
            tls: true,
            rejectUnauthorized: false,
          }
        : undefined,
    });

    client.on('error', (error) => {
      console.error('[Redis Error]', error.message);
    });

    client.on('connect', () => {
      console.log('✅ Redis connecting...');
    });

    client.on('ready', () => {
      console.log('✅ Redis ready');
    });
  }

  return client;
}

/**
 * Returns a resilient Redis-like client interface.
 * If Redis is open and connected, it uses Redis.
 * If Redis is unavailable or fails, it seamlessly uses memoryStore.
 */
function getRedisClient() {
  const rawClient = initRawRedisClient();

  return {
    isOpen: Boolean(rawClient && rawClient.isOpen),

    async get(key) {
      if (rawClient && rawClient.isOpen) {
        try {
          return await rawClient.get(key);
        } catch (error) {
          console.warn(`[Redis get fallback] key=${key}:`, error.message);
        }
      }
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },

    async set(key, value) {
      memoryStore.set(key, String(value));
      if (rawClient && rawClient.isOpen) {
        try {
          return await rawClient.set(key, value);
        } catch (error) {
          console.warn(`[Redis set fallback] key=${key}:`, error.message);
        }
      }
      return 'OK';
    },

    async del(key) {
      memoryStore.delete(key);
      if (rawClient && rawClient.isOpen) {
        try {
          return await rawClient.del(key);
        } catch (error) {
          console.warn(`[Redis del fallback] key=${key}:`, error.message);
        }
      }
      return 1;
    },
  };
}

async function connectRedis() {
  const rawClient = initRawRedisClient();

  if (rawClient.isOpen) return getRedisClient();
  if (!connectPromise) {
    connectPromise = rawClient
      .connect()
      .then(() => {
        console.log(`[Redis] Connected to ${getRedisUrl()}`);
      })
      .catch((error) => {
        console.warn(`⚠️ [Redis Warning] Could not connect to Redis (${error.message}). Running with in-memory fallback.`);
      })
      .finally(() => {
        connectPromise = null;
      });
  }

  await connectPromise;
  return getRedisClient();
}

async function closeRedis() {
  if (client && client.isOpen) {
    try {
      await client.quit();
    } catch (err) {
      console.error('[Redis Close Error]', err.message);
    }
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
};

