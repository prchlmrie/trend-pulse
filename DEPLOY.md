# Deploy TrendPulse as a portfolio demo (Render)

This guide walks you through putting TrendPulse online for free using [Render](https://render.com). No VPS or command-line deploy tools required after the initial GitHub push.

You will get two public URLs:

- **Web app** (React UI) — share this on your portfolio
- **API** (FastAPI) — used automatically by the UI

---

## What you need

1. A [GitHub](https://github.com) account with this project pushed to a repository
2. A [Render](https://render.com) account (sign up with GitHub — easiest)
3. About 15–20 minutes for the first deploy (builds can be slow on the free tier)

Optional later: add `NVIDIA_API_KEY` in Render if you want real LLM answers instead of mock mode.

---

## Step 1 — Push your code to GitHub

If the repo is not on GitHub yet:

```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

(Use `master` instead of `main` if that is your default branch.)

---

## Step 2 — Create the deploy on Render

1. Open [https://dashboard.render.com](https://dashboard.render.com) and log in.
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account if asked, then select the **trendpulse** repository.
4. Render reads `render.yaml` and shows two services:
   - `trendpulse-api` — backend (Docker)
   - `trendpulse-web` — frontend (static site)
5. Click **Apply**.

Render will build and deploy both services. The first build often takes **10–15 minutes** (Python + Node installs).

---

## Step 3 — Open your live demo

When both services show **Live** (green):

1. Open the **trendpulse-web** service → copy its URL (e.g. `https://trendpulse-web.onrender.com`).
2. That URL is your portfolio link.

**Demo login** (created automatically on first API boot):

| Field    | Value     |
|----------|-----------|
| Username | `demo`    |
| Password | `demo123` |

You can also register a new account from the login page.

---

## Step 4 — Add the link to your portfolio

Example wording:

> **TrendPulse** — AI-powered product trend intelligence for online resellers.  
> [Live demo](https://YOUR-WEB-URL.onrender.com) · [GitHub](https://github.com/YOUR-USERNAME/trendpulse)

Replace the URLs with yours.

---

## Free tier behavior (good to know)

| Topic | What happens |
|-------|----------------|
| **Cold start** | After ~15 minutes idle, the API sleeps. The first visit may take **30–60 seconds** to wake up. |
| **Database** | SQLite lives on the container disk. Data survives restarts but can reset on **redeploy**. The API re-seeds demo trends automatically if the DB is empty. |
| **AI features** | Work in **mock mode** without API keys. For real NVIDIA LLM responses, add `NVIDIA_API_KEY` on the `trendpulse-api` service (Environment tab). |
| **Cost** | Free tier is enough for portfolio demos; not for production traffic. |

---

## Optional — Real AI (NVIDIA)

1. Render dashboard → **trendpulse-api** → **Environment**.
2. Add variable: `NVIDIA_API_KEY` = your key from NVIDIA Integrate.
3. Save — Render redeploys the API.

---

## Troubleshooting

### “Cannot reach the API” in the browser

- Confirm **trendpulse-web** finished building (check build logs).
- Confirm **trendpulse-api** is **Live** and `GET /` returns JSON at its URL.
- Rebuild **trendpulse-web** after the API is live (Environment → **Manual Deploy** → Clear build cache & deploy) if the API URL changed.

### Build failed on API

- Open **trendpulse-api** → **Logs**. Common fix: push latest code (includes `start.sh` and updated `Dockerfile`).

### Login works locally but not online

- Use the demo account `demo` / `demo123`, or register a new user on the live site (users are stored in the cloud SQLite DB, not your laptop).

### Page refresh gives 404 on `/dashboard`

- The `render.yaml` rewrite rules should fix this. If not, redeploy **trendpulse-web** from the latest `render.yaml`.

---

## Other hosts (if you outgrow Render)

The same Docker setup works on Railway, Fly.io, or a VPS:

```bash
docker compose up --build
```

For those platforms you still need to set `VITE_API_BASE_URL` to your public API URL when building the frontend, and set `JWT_SECRET` in production.

---

## Files added for deployment

| File | Purpose |
|------|---------|
| `render.yaml` | One-click two-service deploy on Render |
| `backend/start.sh` | Seed demo data on first boot, then start API |
| `backend/Dockerfile` | Uses `start.sh` and honors Render’s `PORT` |
