# Deploy on Render

This project is ready to deploy on Render with a hosted Redis provider such as Upstash or Redis Cloud.

## Before You Start

- Push this repository to GitHub
- Have your `GROQ_API_KEY` ready
- Create a Redis database and copy its connection string

## 1. Create Redis

Use one of these:

- Upstash Redis
- Redis Cloud

Copy the full Redis URL. It usually looks like:

```text
redis://default:password@host:port
```

or sometimes:

```text
rediss://default:password@host:port
```

If your provider gives `rediss://`, use it as-is.

## 2. Deploy on Render

1. Open Render.
2. Click `New +`.
3. Choose `Blueprint`.
4. Select this GitHub repository.
5. Render will detect `render.yaml`.

## 3. Fill Environment Variables

When Render asks for environment variables, set:

- `GROQ_API_KEY`: your Groq API key
- `REDIS_URL`: your hosted Redis connection string
- `CORS_ORIGIN`: your final Render app URL

Example:

```text
https://voice-agent-system.onrender.com
```

You can leave `REDIS_KEY_PREFIX=voice-agent` as default unless you want a custom prefix.

## 4. Deploy

Start the deployment and wait for the service to build and boot.

Render will run:

```bash
npm install
npm start
```

## 5. Verify

After deploy, test:

- App home page: `/`
- Health check: `/health`

The health endpoint should return JSON like:

```json
{"ok":true,"service":"voice-agent-system"}
```

## 6. Important Notes

- Use HTTPS only. Browser speech APIs work best on secure origins.
- If voice requests fail in the browser, double-check `CORS_ORIGIN`.
- If the app fails on startup, verify `REDIS_URL` and `GROQ_API_KEY`.
- If Redis is empty after first deploy, that is normal. Data will appear after you use the app.
