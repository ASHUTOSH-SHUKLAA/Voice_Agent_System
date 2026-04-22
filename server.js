/**
 * server.js - Main Express server
 * Serves the frontend and exposes all API routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const agentRoute = require('./agent/agent');
const todoRoute = require('./tools/todo');
const memoryRoute = require('./memory/memory');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/agent', agentRoute);   // POST /agent → AI agent handler
app.use('/tool', todoRoute);     // CRUD for todos
app.use('/memory', memoryRoute); // Memory save/get

// ─── Root ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Voice Agent Server running at http://localhost:${PORT}`);
});
