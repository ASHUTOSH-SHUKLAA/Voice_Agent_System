/**
 * memory.js - User memory storage + Express routes
 * Stores memory entries in Redis as JSON under a single key
 */

const express = require('express');
const { getRedisClient } = require('../lib/redis');

const router = express.Router();
const MEMORY_KEY = `${process.env.REDIS_KEY_PREFIX || 'voice-agent'}:memory`;

async function readMemory() {
  const raw = await getRedisClient().get(MEMORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeMemory(entries) {
  await getRedisClient().set(MEMORY_KEY, JSON.stringify(entries));
}

async function saveMemory(text) {
  const entries = await readMemory();
  const entry = {
    id: entries.length + 1,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  entries.push(entry);
  await writeMemory(entries);
  return entry;
}

async function getMemory() {
  const entries = await readMemory();
  if (entries.length === 0) return 'No memories stored yet.';
  return entries.map((entry) => `[${entry.timestamp.slice(0, 10)}] ${entry.text}`).join('\n');
}

router.post('/save', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const entry = await saveMemory(text);
    return res.json({ success: true, entry });
  } catch (error) {
    return next(error);
  }
});

router.get('/get', async (req, res, next) => {
  try {
    const memory = await getMemory();
    return res.json({ success: true, memory });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.saveMemory = saveMemory;
module.exports.getMemory = getMemory;
