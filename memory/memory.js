/**
 * memory.js - User memory storage + Express routes
 * Stores memory entries in memory.json as: [{ id, text, timestamp }]
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const MEMORY_FILE = path.join(__dirname, '..', 'data', 'memory.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read memory entries from file */
function readMemory() {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  const raw = fs.readFileSync(MEMORY_FILE, 'utf-8');
  return JSON.parse(raw || '[]');
}

/** Write memory entries back to file */
function writeMemory(entries) {
  fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(entries, null, 2));
}

// ─── Core Functions (called by agent) ────────────────────────────────────────

/** Save a new memory entry */
function saveMemory(text) {
  const entries = readMemory();
  const entry = {
    id: entries.length + 1,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };
  entries.push(entry);
  writeMemory(entries);
  return entry;
}

/** Get all memory entries as a formatted string */
function getMemory() {
  const entries = readMemory();
  if (entries.length === 0) return 'No memories stored yet.';
  return entries.map(e => `[${e.timestamp.slice(0, 10)}] ${e.text}`).join('\n');
}

// ─── Express Routes ───────────────────────────────────────────────────────────

// POST /memory/save  → { text }
router.post('/save', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const entry = saveMemory(text);
  res.json({ success: true, entry });
});

// GET /memory/get
router.get('/get', (req, res) => {
  const memory = getMemory();
  res.json({ success: true, memory });
});

module.exports = router;
module.exports.saveMemory = saveMemory;
module.exports.getMemory = getMemory;
