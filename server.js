/**
 * server.js - Main Express server
 * Serves the frontend and exposes all API routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectRedis, closeRedis } = require('./lib/redis');
const { getJwtSecret } = require('./middleware/auth');
const authRoute = require('./auth/auth');
const { requireAuth } = require('./middleware/auth');
const agentRoute = require('./agent/agent');
const todoRoute = require('./tools/todo');
const memoryRoute = require('./memory/memory');
const speechRoute = require('./speech/transcribe');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Not allowed by CORS'));
}

app.set('trust proxy', 1);
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoute);
app.use('/agent', requireAuth, agentRoute);
app.use('/tool', requireAuth, todoRoute);
app.use('/memory', requireAuth, memoryRoute);
app.use('/speech', requireAuth, speechRoute);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'voice-agent-system' });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  console.error('[Server Error]', err.message);
  return res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

async function startServer() {
  getJwtSecret();
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`Voice Agent Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[Startup Error]', error.message);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedis();
  process.exit(0);
});
