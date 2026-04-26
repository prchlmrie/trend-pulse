import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_tables, get_connection
from app.pipeline import run_pipeline
from app.what_if_simulator import recommend_for_budget


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(lifespan=lifespan, title="TrendPulse API")

# Frontend mockups are commonly opened from static hosts or file previews.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def fetch_table(table_name):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    result = [dict(zip(columns, row)) for row in rows]
    conn.close()
    return result


def _competition_label(score):
    score = float(score or 0.0)
    if score < 0.34:
        return "LOW"
    if score < 0.67:
        return "MEDIUM"
    return "HIGH"


def _rows_to_dicts(cursor):
    rows = cursor.fetchall()
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in rows]


def _build_time_series(cursor, trend_id, days):
    today = datetime.utcnow().date()
    start = today - timedelta(days=days - 1)
    labels = [(start + timedelta(days=i)).isoformat() for i in range(days)]
    by_day = {label: {"mentions": 0, "engagement": 0} for label in labels}

    cursor.execute(
        """
        SELECT substr(r.created_at, 1, 10) AS day,
               COUNT(*) AS mentions,
               COALESCE(SUM(r.engagement), 0) AS engagement
        FROM trend_mentions tm
        JOIN processed_data p ON p.id = tm.processed_id
        JOIN raw_data r ON r.id = p.raw_id
        WHERE tm.trend_id = ?
          AND date(substr(r.created_at, 1, 10)) >= date(?)
        GROUP BY day
        ORDER BY day
        """,
        (trend_id, start.isoformat()),
    )

    for day, mentions, engagement in cursor.fetchall():
        if day in by_day:
            by_day[day] = {"mentions": int(mentions or 0), "engagement": float(engagement or 0.0)}

    return {
        "labels": labels,
        "mentions": [by_day[label]["mentions"] for label in labels],
        "engagement": [by_day[label]["engagement"] for label in labels],
    }


@app.get("/")
def root():
    return {"message": "TrendPulse API is running"}


@app.post("/pipeline/run")
def run_pipeline_now():
    run_pipeline()
    return {"ok": True, "message": "Pipeline completed"}


@app.get("/data")
def get_data():
    return {
        "raw_data": fetch_table("raw_data"),
        "processed_data": fetch_table("processed_data"),
        "trends": fetch_table("trends"),
    }


@app.get("/all")
def get_all_tables():
    tables = [
        "raw_data",
        "processed_data",
        "trends",
        "trend_mentions",
        "trend_metrics",
        "product_insights",
        "recommendations",
        "alerts",
        "users",
        "user_recommendations",
    ]
    return {table: fetch_table(table) for table in tables}


@app.get("/dashboard/summary")
def get_dashboard_summary():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            SUM(CASE WHEN lifecycle_stage = 'EMERGING' THEN 1 ELSE 0 END) AS emerging,
            SUM(CASE WHEN lifecycle_stage = 'GROWING' THEN 1 ELSE 0 END) AS growing,
            SUM(CASE WHEN lifecycle_stage = 'PEAKING' THEN 1 ELSE 0 END) AS peaking,
            SUM(CASE WHEN lifecycle_stage = 'DECLINING' THEN 1 ELSE 0 END) AS declining
        FROM trend_metrics
        """
    )
    stage_row = cursor.fetchone() or (0, 0, 0, 0)
    lifecycle_counts = {
        "emerging": int(stage_row[0] or 0),
        "growing": int(stage_row[1] or 0),
        "peaking": int(stage_row[2] or 0),
        "declining": int(stage_row[3] or 0),
    }

    cursor.execute(
        """
        SELECT
            t.id AS trend_id,
            t.name AS trend_name,
            COALESCE(tm.predicted_growth_14d, 0) AS predicted_growth_14d,
            COALESCE(tm.trend_score, 0) AS trend_score,
            COALESCE(pi.competition_score, 0) AS competition_score,
            COALESCE(pi.profit_score, 0) AS profit_score,
            COALESCE(r.suggested_action, 'IGNORE') AS suggested_action,
            COALESCE(r.risk_level, 'MEDIUM') AS risk_level,
            COALESCE(r.entry_timing, 'WAIT_AND_MONITOR') AS entry_timing,
            COALESCE(r.suggested_inventory, '') AS suggested_inventory
        FROM trends t
        LEFT JOIN trend_metrics tm ON tm.trend_id = t.id
        LEFT JOIN product_insights pi ON pi.trend_id = t.id
        LEFT JOIN recommendations r ON r.trend_id = t.id
        ORDER BY pi.profit_score DESC, tm.trend_score DESC
        LIMIT 8
        """
    )
    top_rows = _rows_to_dicts(cursor)
    top_opportunities = []
    for row in top_rows:
        top_opportunities.append(
            {
                **row,
                "competition_level": _competition_label(row["competition_score"]),
            }
        )

    cursor.execute(
        """
        SELECT id, trend_id, alert_level, message, created_at
        FROM alerts
        ORDER BY id DESC
        LIMIT 12
        """
    )
    alerts = _rows_to_dicts(cursor)

    cursor.execute("SELECT AVG(confidence) FROM user_recommendations")
    avg_conf = float((cursor.fetchone() or [0])[0] or 0.0)

    conn.close()
    return {
        "lifecycle_counts": lifecycle_counts,
        "top_opportunities": top_opportunities,
        "live_alerts": alerts,
        "confidence_score": round(avg_conf * 100, 2),
    }


@app.get("/notifications")
def get_notifications(limit: int = Query(20, ge=1, le=100)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, trend_id, alert_level, message, created_at
        FROM alerts
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    )
    items = _rows_to_dicts(cursor)
    conn.close()
    return {"items": items}


@app.get("/opportunities/analyze")
def analyze_budget(budget: float = Query(..., gt=0), top_n: int = Query(3, ge=1, le=10)):
    picks, remaining = recommend_for_budget(budget, top_n=top_n)
    return {
        "budget": budget,
        "recommended_products": picks,
        "remaining_budget": remaining,
    }


@app.get("/trends")
def get_trends(
    limit: int = Query(50, ge=1, le=500),
    search: str | None = None,
    lifecycle_stage: str | None = None,
    action: str | None = None,
):
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT
            t.id,
            t.name,
            t.category,
            COALESCE(t.strength, 0) AS strength,
            COALESCE(tm.frequency, 0) AS frequency,
            COALESCE(tm.velocity, 0) AS velocity,
            COALESCE(tm.predicted_growth_14d, 0) AS predicted_growth_14d,
            COALESCE(tm.trend_score, 0) AS trend_score,
            COALESCE(tm.lifecycle_stage, 'EMERGING') AS lifecycle_stage,
            COALESCE(pi.product_category, 'general') AS product_category,
            COALESCE(pi.competition_score, 0) AS competition_score,
            COALESCE(pi.profit_score, 0) AS profit_score,
            COALESCE(r.suggested_action, 'IGNORE') AS suggested_action,
            COALESCE(r.risk_level, 'MEDIUM') AS risk_level,
            COALESCE(r.entry_timing, 'WAIT_AND_MONITOR') AS entry_timing
        FROM trends t
        LEFT JOIN trend_metrics tm ON tm.trend_id = t.id
        LEFT JOIN product_insights pi ON pi.trend_id = t.id
        LEFT JOIN recommendations r ON r.trend_id = t.id
    """
    params = []
    filters = []

    if search:
        filters.append("LOWER(t.name) LIKE ?")
        params.append(f"%{search.strip().lower()}%")
    if lifecycle_stage:
        filters.append("UPPER(COALESCE(tm.lifecycle_stage, '')) = ?")
        params.append(lifecycle_stage.strip().upper())
    if action:
        filters.append("UPPER(COALESCE(r.suggested_action, '')) = ?")
        params.append(action.strip().upper())

    if filters:
        query += " WHERE " + " AND ".join(filters)

    query += " ORDER BY pi.profit_score DESC, tm.trend_score DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, tuple(params))
    rows = _rows_to_dicts(cursor)
    conn.close()
    for row in rows:
        row["competition_level"] = _competition_label(row["competition_score"])
    return {"items": rows}


@app.get("/trends/{trend_id}")
def get_trend_detail(trend_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            t.id,
            t.name,
            t.category,
            COALESCE(t.strength, 0) AS strength,
            COALESCE(tm.frequency, 0) AS frequency,
            COALESCE(tm.total_engagement, 0) AS total_engagement,
            COALESCE(tm.avg_engagement, 0) AS avg_engagement,
            COALESCE(tm.velocity, 0) AS velocity,
            COALESCE(tm.predicted_growth_14d, 0) AS predicted_growth_14d,
            COALESCE(tm.trend_score, 0) AS trend_score,
            COALESCE(tm.lifecycle_stage, 'EMERGING') AS lifecycle_stage,
            COALESCE(pi.product_category, 'general') AS product_category,
            COALESCE(pi.price_min, 0) AS price_min,
            COALESCE(pi.price_max, 0) AS price_max,
            COALESCE(pi.demand_score, 0) AS demand_score,
            COALESCE(pi.competition_score, 0) AS competition_score,
            COALESCE(pi.profit_score, 0) AS profit_score,
            COALESCE(r.suggested_action, 'IGNORE') AS suggested_action,
            COALESCE(r.suggested_inventory, '') AS suggested_inventory,
            COALESCE(r.entry_timing, 'WAIT_AND_MONITOR') AS entry_timing,
            COALESCE(r.risk_level, 'MEDIUM') AS risk_level,
            COALESCE(r.reasoning, '') AS reasoning
        FROM trends t
        LEFT JOIN trend_metrics tm ON tm.trend_id = t.id
        LEFT JOIN product_insights pi ON pi.trend_id = t.id
        LEFT JOIN recommendations r ON r.trend_id = t.id
        WHERE t.id = ?
        LIMIT 1
        """,
        (trend_id,),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Trend not found")

    columns = [desc[0] for desc in cursor.description]
    detail = dict(zip(columns, row))

    detail["competition_level"] = _competition_label(detail["competition_score"])
    detail["series_7d"] = _build_time_series(cursor, trend_id, 7)
    detail["series_30d"] = _build_time_series(cursor, trend_id, 30)
    detail["series_90d"] = _build_time_series(cursor, trend_id, 90)

    cursor.execute(
        """
        SELECT p.extracted_keywords
        FROM trend_mentions tm
        JOIN processed_data p ON p.id = tm.processed_id
        WHERE tm.trend_id = ?
        """,
        (trend_id,),
    )
    keyword_cluster = {}
    for (raw_keywords,) in cursor.fetchall():
        try:
            keywords = json.loads(raw_keywords or "[]")
        except json.JSONDecodeError:
            keywords = []
        for keyword in keywords:
            key = str(keyword).strip().lower()
            if not key:
                continue
            keyword_cluster[key] = keyword_cluster.get(key, 0) + 1
    sorted_clusters = sorted(keyword_cluster.items(), key=lambda kv: (-kv[1], kv[0]))
    detail["keyword_clusters"] = [{"keyword": k, "count": v} for k, v in sorted_clusters[:20]]

    cursor.execute(
        """
        SELECT id, alert_level, message, created_at
        FROM alerts
        WHERE trend_id = ?
        ORDER BY id DESC
        LIMIT 5
        """,
        (trend_id,),
    )
    detail["alerts"] = _rows_to_dicts(cursor)
    conn.close()
    return detail


@app.get("/users/{user_id}/recommendations")
def get_user_recommendations(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, budget, risk_tolerance, preferred_categories, experience_level FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    if not user_row:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    user_columns = [desc[0] for desc in cursor.description]
    user = dict(zip(user_columns, user_row))

    cursor.execute(
        """
        SELECT
            ur.id,
            ur.allocated_budget,
            ur.expected_return,
            ur.confidence,
            ur.status,
            ur.created_at,
            r.suggested_action,
            r.suggested_inventory,
            r.entry_timing,
            r.risk_level,
            r.reasoning,
            t.id AS trend_id,
            t.name AS trend_name
        FROM user_recommendations ur
        JOIN recommendations r ON r.id = ur.recommendation_id
        JOIN trends t ON t.id = r.trend_id
        WHERE ur.user_id = ?
        ORDER BY ur.allocated_budget DESC
        """,
        (user_id,),
    )
    items = _rows_to_dicts(cursor)
    conn.close()
    return {"user": user, "items": items}
