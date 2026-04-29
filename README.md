# Voice-Based AI Agent with Memory, Tools, and JWT Auth

This is a full-stack Voice AI Agent built with Node.js, Express, Groq, Redis, and JWT-based authentication. Users can sign up with email, log in, and access their own private task and memory data.

## Features

- Separate signup and login pages with email-based authentication
- JWT-protected assistant APIs
- Voice interface using browser Speech-to-Text and Text-to-Speech
- Intelligent agent with tool calling for task and memory actions
- User-specific todo management and stored memory
- Production-friendly API with health checks and configurable CORS

## Tech Stack

- Backend: Node.js, Express, Groq SDK, Redis
- Security: JWT authentication with hashed passwords
- Frontend: Vanilla HTML, CSS, JavaScript
- APIs: Web Speech API, SpeechSynthesis, Groq Cloud

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your values.
   ```env
   PORT=3000
   NODE_ENV=development
   GROQ_API_KEY=your_groq_api_key_here
   JWT_SECRET=replace_with_a_long_random_secret
   JWT_EXPIRES_IN=7d
   REDIS_URL=redis://127.0.0.1:6379
   CORS_ORIGIN=http://localhost:3000
   REDIS_KEY_PREFIX=voice-agent
   ```

3. Start Redis:
   Run Redis locally or use a hosted provider such as Upstash or Redis Cloud.

4. Start the server:
   ```bash
   npm start
   ```

5. Open the app:
   Visit `http://localhost:3000`.

## Project Structure

- `server.js`: Main Express entry point
- `auth/`: Signup, login, and session routes
- `middleware/`: JWT middleware
- `agent/`: Agent logic and prompt
- `tools/`: Todo CRUD routes and functions
- `memory/`: User memory routes and functions
- `lib/`: Shared infrastructure such as the Redis client
- `public/`: Main app, login page, signup page, and frontend assets

## Deployment Notes

- Set `GROQ_API_KEY`, `JWT_SECRET`, `REDIS_URL`, `CORS_ORIGIN`, and optionally `REDIS_KEY_PREFIX` in your hosting provider.
- Deploy on a Node host such as Render, Railway, or Fly.io.
- Use HTTPS in production so browser speech APIs work reliably.
- Set `CORS_ORIGIN` to your deployed frontend URL. You can provide multiple origins as a comma-separated list.
- The frontend stores the JWT in browser local storage after login or signup.
- Signup requires email, password, and confirm password.
- Check `/health` after deployment to confirm the service is up.

## Render Deployment

This repo includes a `render.yaml` blueprint for the web service.

1. Push the repo to GitHub.
2. In Render, create a new Blueprint instance from the repository.
3. Fill in the secret values for `GROQ_API_KEY`, `JWT_SECRET`, `REDIS_URL`, and `CORS_ORIGIN`.
4. Deploy and verify the `/health` endpoint.

For a short step-by-step guide, see `DEPLOY.md`.
