# Frontend Handoff Guide

This file explains what frontend should build based on the current backend state.

## Primary Endpoints

Use these first:

- `GET /dashboard/summary`
- `GET /trends`
- `GET /trends/{trend_id}`
- `GET /opportunities/analyze?budget=3000&top_n=3`
- `GET /users/{user_id}/recommendations`
- `GET /notifications`

`GET /all` is still available for raw-table debugging and quick fallback integration.

## Minimum Screens

1. Dashboard
2. Trends Table
3. Product Insights Table
4. Recommendations Table
5. Alerts Feed
6. User Personalization View
7. Budget What-if Panel (optional UI input + backend helper wiring later)

## Suggested Dashboard Cards

- Total trends (`trends.length`)
- High-opportunity alerts (`alerts` where `alert_level == "HIGH_OPPORTUNITY"`)
- Average trend score (from `trend_metrics`)
- Top profit trend (max `product_insights.profit_score`)
- Total personalized recommendations (`user_recommendations.length`)

## Tables and Columns to Render

### Trends

From `trends` + `trend_metrics`:

- `name`
- `category`
- `strength`
- `trend_score`
- `velocity`
- `predicted_growth_14d`
- `lifecycle_stage`

### Product Insights

From `product_insights` joined with `trends`:

- `trend_name`
- `product_category`
- `price_min`, `price_max`
- `demand_score`
- `competition_score`
- `profit_score`

### Recommendations

From `recommendations` joined with `trends`:

- `trend_name`
- `suggested_action`
- `entry_timing`
- `suggested_inventory`
- `risk_level`
- `reasoning`

### Alerts

From `alerts`:

- `alert_level`
- `message`
- `created_at`

### Users

From `users`:

- `name`
- `budget`
- `risk_tolerance`
- `preferred_categories`
- `experience_level`

### User Recommendations

From `user_recommendations` joined with `users`, `recommendations`, and `trends`:

- `user_name`
- `trend_name`
- `suggested_action`
- `allocated_budget`
- `expected_return`
- `confidence`
- `status`

## UI Behavior Suggestions

- Add filter chips:
  - action (`SELL`, `TEST`, `IGNORE`)
  - lifecycle (`EMERGING`, `GROWING`, `PEAKING`, `DECLINING`)
  - risk (`LOW`, `MEDIUM`, `HIGH`)
- Sort defaults:
  - Insights by `profit_score DESC`
  - Recommendations by action priority (`SELL > TEST > IGNORE`)
  - Alerts by newest first
- Highlight rules:
  - `SELL` green
  - `TEST` amber
  - `IGNORE` gray
  - `HIGH_OPPORTUNITY` banner style

## Frontend Data Joins

Because `/all` returns separate arrays, frontend should build maps:

- `trendById`
- `recommendationById`
- `userById`

Then compose rows client-side for display pages.

## Expected Action Flow

1. Load `/dashboard/summary` for Command Center
2. Load `/trends` for Trend Explorer list
3. Load `/trends/{id}` for Trend detail drill-down
4. Call `/opportunities/analyze` when budget is submitted
5. Load `/users/{id}/recommendations` for personalized rows
6. Load `/notifications` for navbar bell and live alert feed

## Optional Next API Improvements

If needed later, backend can add:

- `/dashboard/summary`
- `/recommendations/top`
- `/users/{id}/recommendations`

Current backend already includes `/dashboard/summary` and `/users/{id}/recommendations`.
