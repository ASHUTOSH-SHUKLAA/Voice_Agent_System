const { createClient } = require('redis');

let client;
let connectPromise;

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

function getRedisClient() {
  if (!client) {
    client = createClient({ url: getRedisUrl() });
    client.on('error', (error) => {
      console.error('[Redis Error]', error.message);
    });
  }

  return client;
}

async function connectRedis() {
  const redis = getRedisClient();

  if (redis.isOpen) return redis;
  if (!connectPromise) {
    connectPromise = redis.connect().finally(() => {
      connectPromise = null;
    });
  }

  await connectPromise;
  console.log(`[Redis] Connected to ${getRedisUrl()}`);
  return redis;
}

async function closeRedis() {
  if (client && client.isOpen) {
    await client.quit();
  }
}

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
};
