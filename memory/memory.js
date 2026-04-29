/**
 * memory.js - User memory storage + Express routes
 * Stores memory entries in Redis as JSON under a per-user key
 */

const express = require('express');
const { getRedisClient } = require('../lib/redis');

const router = express.Router();
const MEMORY_KEY_PREFIX = `${process.env.REDIS_KEY_PREFIX || 'voice-agent'}:memory`;

function memoryKey(email) {
  return `${MEMORY_KEY_PREFIX}:${String(email).toLowerCase()}`;
}

async function readMemory(email) {
  const raw = await getRedisClient().get(memoryKey(email));
  return raw ? JSON.parse(raw) : [];
}

async function writeMemory(email, entries) {
  await getRedisClient().set(memoryKey(email), JSON.stringify(entries));
}

async function saveMemory(email, text) {
  const entries = await readMemory(email);
  const entry = {
    id: entries.length + 1,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  entries.push(entry);
  await writeMemory(email, entries);
  return entry;
}

async function getMemory(email) {
  const entries = await readMemory(email);
  if (entries.length === 0) return 'No memories stored yet.';
  return entries.map((entry) => `[${entry.timestamp.slice(0, 10)}] ${entry.text}`).join('\n');
}

router.post('/save', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const entry = await saveMemory(req.user.email, text);
    return res.json({ success: true, entry });
  } catch (error) {
    return next(error);
  }
});

router.get('/get', async (req, res, next) => {
  try {
    const memory = await getMemory(req.user.email);
    return res.json({ success: true, memory });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.saveMemory = saveMemory;
module.exports.getMemory = getMemory;
