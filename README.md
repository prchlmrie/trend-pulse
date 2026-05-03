# TrendPulse

TrendPulse is an AI-powered platform that converts noisy market signals into trend intelligence, profit scoring, recommendations, and user-personalized actions. It consists of a FastAPI backend and a React frontend.

## Architecture

1. Signal Layer: `raw_data -> processed_data`
2. Trend Layer: `trends + trend_mentions`
3. Intelligence Layer: `trend_metrics + product_insights`
4. Decision Layer: `recommendations + alerts`
5. Personalization Layer: `users + user_recommendations`

## Project Structure

```text
trendpulse/
  app/                          # Backend FastAPI application
    ai.py
    ai_analyst.py
    nvidia_llm.py
    alerts_engine.py
    business_intelligence.py
    database.py
    main.py
    pipeline.py
    preprocess.py
    recommendation_engine.py
    sample_data.py
    trend_analytics.py
    trend_engine.py
    user_personalization.py
    what_if_simulator.py
  frontend/                     # React frontend application
    src/
      components/
        Badge.jsx
        Button.jsx
        Card.jsx
        CommandCenter.jsx      # Dashboard view
        GenerateStrategyPanel.jsx
        Layout.jsx
        OpportunityFinder.jsx  # Budget recommendations
        TrendDetail.jsx        # Individual trend analysis
        TrendExplorer.jsx      # Trend browsing
        AiAnalyst.jsx          # NVIDIA-backed Q&A
      api/
        client.js              # API client for backend
      utils/
        formatters.js
    public/
    package.json
    vite.config.js
  FRONTEND_HANDOFF.md
  requirements.txt
  trendpulse.db
```

## Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Create .env (see .env.example). NVIDIA Integrate API — OpenAI-compatible.
echo "NVIDIA_API_KEY=your_nvidia_key_here" > .env
echo "MONGO_URI=mongodb://localhost:27017" >> .env
# Defaults: analyst uses streaming + Nemotron thinking (65536 max tokens cap). Set NVIDIA_ENABLE_THINKING=0 to disable.

# Seed the database with sample data
python run_seed.py

# Run the API server
uvicorn app.main:app --reload
```

## Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

## Running the Full Application

1. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser to `http://localhost:5173` (Vite dev server)

## API Endpoints

- `GET /` health check
- `POST /pipeline/run` run full pipeline
- `GET /dashboard/summary` command-center aggregates (lifecycle counts, opportunities, alerts, confidence)
- `GET /notifications?limit=20` alert feed for navbar/live alerts
- `GET /trends?search=&lifecycle_stage=&action=&limit=50` trend explorer list
- `GET /trends/{trend_id}` trend detail (7/30/90-day series, keyword clusters, metrics)
- `GET /opportunities/analyze?budget=3000&top_n=3` budget recommendation output
- `POST /api/ai-analyst` natural-language trend Q&A (NVIDIA; mock if `NVIDIA_API_KEY` unset)
- `GET /users/{user_id}/recommendations` personalized recommendations for profile view
- `GET /data` quick raw/processed/trends view
- `GET /all` full-table snapshot

## Frontend Features

- **Dashboard (Command Center)**: Overview of trend lifecycles, opportunities, alerts, and confidence metrics
- **Trend Explorer**: Browse and search trends with filtering by lifecycle stage and recommended actions
- **Trend Detail**: Deep dive into individual trends with time series data, keyword analysis, and metrics
- **Opportunity Finder**: Budget-based product recommendations and strategy generation
- **AI Analyst**: Questions answered with live DB context via NVIDIA (`/api/ai-analyst`)

## Notes

- CORS is enabled for frontend integration from local/static mockups.
- Mock data is deduplicated and safe for repeat runs.
- Schema migrations are handled in `create_tables()` to keep older DB files compatible.
- Keyword extraction and the AI analyst use the [NVIDIA Integrate API](https://docs.api.nvidia.com/) (`NVIDIA_API_KEY`). Default model is configurable via `NVIDIA_MODEL`.
- Sample AI prompt/response examples are documented in `SAMPLE_AI_CONVERSATIONS.md`.
- Planned conversational AI examples are documented in `PLANNED_AI_CONVERSATIONS.md`.

Run full pipeline:

```bash
python -c "from app.pipeline import run_pipeline; run_pipeline()"
```

Run API:

```bash
uvicorn app.main:app --reload
```
