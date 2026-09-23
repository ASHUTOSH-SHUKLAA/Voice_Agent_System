/**
 * memory.js - User memory storage + Express routes
 * Stores memory entries in Redis as JSON under a per-user key
 */

const express = require('express');
const { getRedisClient } = require('../lib/redis');

const router = express.Router();
const MEMORY_KEY_PREFIX = `${process.env.REDIS_KEY_PREFIX || 'voice-agent'}:memory`;

function memoryKey(email) {
  return `${MEMORY_KEY_PREFIX}:${String(email || 'default').toLowerCase()}`;
}

function sanitizeMemoryText(raw) {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object') {
    const val = raw.text || raw.memory || raw.info || raw.content || raw.data;
    return typeof val === 'string' ? val.trim() : String(val || '').trim();
  }
  return String(raw || '').trim();
}

async function readMemory(email) {
  try {
    const raw = await getRedisClient().get(memoryKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Memory Error] readMemory failed:', error.message);
    return [];
  }
}

async function writeMemory(email, entries) {
  try {
    const safeEntries = Array.isArray(entries) ? entries : [];
    await getRedisClient().set(memoryKey(email), JSON.stringify(safeEntries));
  } catch (error) {
    console.error('[Memory Error] writeMemory failed:', error.message);
  }
}

async function saveMemory(email, rawText) {
  const entries = await readMemory(email);
  const cleanText = sanitizeMemoryText(rawText);
  if (!cleanText) return null;

  const entry = {
    id: entries.length + 1,
    text: cleanText,
    timestamp: new Date().toISOString(),
  };

  entries.push(entry);
  await writeMemory(email, entries);
  return entry;
}

async function getMemory(email) {
  const entries = await readMemory(email);
  if (!Array.isArray(entries) || entries.length === 0) return 'No memories stored yet.';
  return entries
    .filter((entry) => entry && entry.text)
    .map((entry) => `[${(entry.timestamp || new Date().toISOString()).slice(0, 10)}] ${entry.text}`)
    .join('\n');
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
