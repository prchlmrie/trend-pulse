# TrendPulse

TrendPulse is an AI-powered platform that converts noisy market signals into trend intelligence, profit scoring, recommendations, and user-personalized actions.

## Project structure

```text
trendpulse/
  backend/          # FastAPI API, pipeline, SQLite
    app/
    requirements.txt
    run_seed.py
    tests/
  frontend/         # React + Vite UI
    src/
    package.json
  docker-compose.yml
```

## Backend

```bash
cd backend
pip install -r requirements.txt

# Copy .env.example to .env and set NVIDIA_API_KEY (optional for mock mode)
cp .env.example .env

python run_seed.py
uvicorn app.main:app --reload
```

API: http://localhost:8000

## Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173 (proxies API via `VITE_API_BASE_URL`, default `http://localhost:8000`)

## Docker

```bash
docker compose up --build
```

- API: http://localhost:8000
- Web: http://localhost:8080

## Main API routes

- `GET /` — health
- `POST /pipeline/run` — full pipeline
- `GET /dashboard/summary` — command center aggregates
- `GET /trends` — trend list (search / filters)
- `GET /trends/{id}` — trend detail
- `POST /api/ai-analyst` — natural-language Q&A
- `GET /opportunities/analyze?budget=&top_n=` — budget picks
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
