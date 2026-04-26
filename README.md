# TrendPulse Backend

TrendPulse is an AI-powered backend that converts noisy market signals into trend intelligence, profit scoring, recommendations, and user-personalized actions.

## Architecture

1. Signal Layer: `raw_data -> processed_data`
2. Trend Layer: `trends + trend_mentions`
3. Intelligence Layer: `trend_metrics + product_insights`
4. Decision Layer: `recommendations + alerts`
5. Personalization Layer: `users + user_recommendations`

## Project Structure

```text
trendpulse/
  app/
    ai.py
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
  FRONTEND_HANDOFF.md
  requirements.txt
  trendpulse.db
```

## Setup

```bash
pip install -r requirements.txt
```

Create `.env`:

```env
QWEN_API_KEY=your_qwen_key_here
MONGO_URI=mongodb://localhost:27017
```

## Run

Run full pipeline:

```bash
python -c "from app.pipeline import run_pipeline; run_pipeline()"
```

Run API:

```bash
uvicorn app.main:app --reload
```

## API Endpoints

- `GET /` health check
- `POST /pipeline/run` run full pipeline
- `GET /dashboard/summary` command-center aggregates (lifecycle counts, opportunities, alerts, confidence)
- `GET /notifications?limit=20` alert feed for navbar/live alerts
- `GET /trends?search=&lifecycle_stage=&action=&limit=50` trend explorer list
- `GET /trends/{trend_id}` trend detail (7/30/90-day series, keyword clusters, metrics)
- `GET /opportunities/analyze?budget=3000&top_n=3` budget recommendation output
- `GET /users/{user_id}/recommendations` personalized recommendations for profile view
- `GET /data` quick raw/processed/trends view
- `GET /all` full-table snapshot

## Notes

- CORS is enabled for frontend integration from local/static mockups.
- Mock data is deduplicated and safe for repeat runs.
- Schema migrations are handled in `create_tables()` to keep older DB files compatible.
