# Voice-Based AI Agent with Memory & Tools

This is a full-stack Voice AI Agent built with Node.js, Express, and Groq. It uses the Web Speech API for voice interaction and Redis for lightweight persistent storage that works much better in deployment than local JSON files.

## 🚀 Live Demo

👉 https://voice-agent-system.onrender.com

---

## Features

* Voice interface using browser Speech-to-Text and Text-to-Speech
* Intelligent agent with tool calling for task and memory actions
* Todo management through natural voice commands
* Personal memory that persists in Redis
* Production-friendly API with health checks and configurable CORS

---

## Tech Stack

* Backend: Node.js, Express, Groq SDK, Redis
* Frontend: Vanilla HTML, CSS, JavaScript
* APIs: Web Speech API, SpeechSynthesis, Groq Cloud

---

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

---

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```env
PORT=3000
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key_here
REDIS_URL=redis://127.0.0.1:6379
CORS_ORIGIN=http://localhost:3000
REDIS_KEY_PREFIX=voice-agent
```

---

### 3. Start Redis

Run Redis locally OR use a hosted provider like:

* Upstash (recommended for deployment)
* Redis Cloud

---

### 4. Start the server

```bash
npm start
```

---

### 5. Open the app

Visit:

```
http://localhost:3000
```

---

## Project Structure

* `server.js`: Main Express entry point
* `agent/`: Agent logic and prompt
* `tools/`: Todo CRUD routes and functions
* `memory/`: User memory routes and functions
* `lib/`: Shared infrastructure such as the Redis client
* `public/`: Frontend assets

---

## 🌍 Production Environment Variables

For deployment (e.g., Render), use:

```env
NODE_ENV=production
GROQ_API_KEY=your_real_key
REDIS_URL=rediss://your_upstash_url
CORS_ORIGIN=https://voice-agent-system.onrender.com
REDIS_KEY_PREFIX=voice-agent
```

---

## Deployment Notes

* Set `GROQ_API_KEY`, `REDIS_URL`, `CORS_ORIGIN`, and optionally `REDIS_KEY_PREFIX` in your hosting provider
* Deploy on a Node host such as Render, Railway, or Fly.io
* Use HTTPS in production so browser speech APIs work reliably
* Set `CORS_ORIGIN` to your deployed frontend URL
* You can provide multiple origins as a comma-separated list
* Check `/health` after deployment to confirm the service is running

---

## Render Deployment

This repo includes a `render.yaml` (or `render.yml`) blueprint for the web service.

### Steps:

1. Push the repo to GitHub
2. In Render, create a new Blueprint instance from the repository
3. Fill in the secret values for:

   * `GROQ_API_KEY`
   * `REDIS_URL`
   * `CORS_ORIGIN`
4. Deploy and verify:

```
https://voice-agent-system.onrender.com/health
```

---

## Important Notes

* Use `rediss://` (TLS) for Redis in production
* Do NOT commit `.env` to GitHub
* Rotate API keys if accidentally exposed
* Ensure Redis is connected properly to avoid runtime errors

---

## 📌 Additional Docs

For a short step-by-step guide, see:

```
DEPLOY.md
```
