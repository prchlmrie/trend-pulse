# TrendPulse: An AI-Powered Product Opportunity Intelligence System

## System description

TrendPulse is an AI-powered decision support system that analyzes online data from social media and e-commerce signals to identify emerging product trends and convert them into actionable business insights.

The system ingests and processes market signals (search trends, product listings, and related text), extracts meaningful product intelligence using NLP and large language models, and evaluates opportunities based on growth, demand, competition, and modeled unit economics. It surfaces recommendations such as which products to prioritize, when to test or scale, and how much inventory fits a seller’s budget.

The web app acts as a smart assistant for small-scale resellers: a **Command Center** daily briefing, **Browse Trends** catalog, **Find Profits** budget planner, **AI Analyst** for plain-language Q&A, and per-product **trend detail** pages with merchant-friendly guidance.

## Problem solved

Many small vendors and resellers struggle to identify which products will sell well before trends become saturated. They often rely on manual browsing of social media or marketplaces, which is time-consuming, inconsistent, and reactive rather than proactive.

As a result:

- Sellers enter trends too late, when competition is already high
- They invest in products with low or declining demand
- They lack a systematic way to evaluate business opportunities

TrendPulse addresses this by transforming scattered marketplace and trend data into structured insights and early-stage recommendations—helping users spot profitable opportunities before they peak.

## Target users

TrendPulse is designed for:

- Online resellers (e.g. Shopee/Lazada sellers) looking for trending products
- Small business owners who want data-driven product decisions
- Beginner entrepreneurs who lack experience in market analysis
- Social media sellers who rely on platforms like TikTok or Facebook Marketplace

These users typically do not have access to professional analytics tools and rely on guesswork or manual browsing—making TrendPulse a practical, accessible alternative for smarter selling decisions.

## Language & tools

| Layer | Stack |
|--------|--------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query |
| **Backend** | FastAPI (Python), Uvicorn |
| **AI / NLP** | NVIDIA Integrate API (OpenAI-compatible client; default Nemotron model), optional mock mode without API key |
| **Data ingestion** | SerpApi (Google Trends / search JSON APIs) |
| **Semantic search** | ChromaDB (trend vector index for AI Analyst) |
| **Database** | SQLite (local `trendpulse.db`; SQLAlchemy models) |
| **Auth** | JWT (register/login), per-user budget and profile |
| **Ops** | Docker Compose, pytest |

> **Note:** The stack does not use Qwen or Pandas in the current codebase. LLM calls go through the NVIDIA Integrate endpoint configured in `backend/app/nvidia_llm.py`.

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

Optional environment variables (see `backend/.env.example`):

- `NVIDIA_API_KEY` — LLM for keywords, sentiment, AI Analyst
- `SERPAPI_API_KEY` — live trend ingestion via SerpApi
- `MONGO_URI` — optional; pipeline may use Mongo for raw signals where configured

## Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173 (set `VITE_API_BASE_URL` if the API is not on `http://localhost:8000`)

## Docker

```bash
docker compose up --build
```

- API: http://localhost:8000
- Web: http://localhost:8080

## Deploy (portfolio demo)

For a free public demo on Render (no VPS required), follow **[DEPLOY.md](./DEPLOY.md)**. Connect the GitHub repo as a Blueprint; `render.yaml` provisions the API and frontend automatically.

## Main API routes

- `GET /` — health
- `POST /pipeline/run` — full catalog pipeline
- `GET /dashboard/summary` — Command Center aggregates
- `GET /trends` — trend list (search / filters)
- `GET /trends/{id}` — trend detail
- `POST /api/ai-analyst` — natural-language Q&A
- `GET /opportunities/analyze?budget=&top_n=` — budget-based picks
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

## Main UI routes

- `/` — Sign in / create account (with starting budget)
- `/dashboard` — Command Center (hot items, daily briefing)
- `/trends` — Browse trends
- `/trends/:id` — Product / trend detail
- `/opportunities` — Find Profits wizard
- `/ai-analyst` — AI Analyst
- `/reseller-blueprint` — Business plan view
