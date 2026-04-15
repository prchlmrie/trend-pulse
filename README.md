# TrendPulse — Backend Setup Guide

## Project Structure
```
trendpulse/
├── data/               ← Generated mock data lives here
├── preprocessing/      ← Text cleaning module (next step)
├── nlp/                ← Qwen NLP analysis module (next step)
├── trend_engine/       ← Scoring and alert logic (next step)
├── api/                ← FastAPI endpoints (next step)
├── scripts/
│   ├── generate_mock_data.py   ← Step 1: Generate posts via Qwen
│   └── seed_mongodb.py         ← Step 2: Load posts into MongoDB
├── .env
└── requirements.txt
```

## Setup Instructions

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Then open .env and fill in your QWEN_API_KEY and MONGO_URI
```

### 3. Generate mock data (~300 posts, takes 3-5 mins due to API calls)
```bash
python scripts/generate_mock_data.py
```
This creates `data/mock_posts.json`

### 4. Seed into MongoDB
```bash
python scripts/seed_mongodb.py
```

## What the Mock Data Looks Like
- 7 days of posts (April 9–15, 2025)
- 11 products across 4 categories (fashion, accessories, gadgets, skincare)
- Each product has a natural spike day where mentions surge
- Posts are realistic Taglish captions with hashtags and emojis
- Spread across TikTok, Instagram, and Shopee

## Next Steps (after data is seeded)
1. `preprocessing/` — Clean and normalize captions
2. `nlp/` — Send cleaned text to Qwen for keyword extraction
3. `trend_engine/` — Compute trend scores and detect spikes
4. `api/` — Expose results via FastAPI
