"""Read-only persistence surface for the AI analyst (Protocol + SQLite implementation)."""

from __future__ import annotations

from typing import Optional, Protocol

from app.analyst_context import TrendContext, UserContext
from app.database import get_connection


def _rows_to_dicts(cursor) -> list[dict]:
    rows = cursor.fetchall()
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, r)) for r in rows]


class AnalystRepository(Protocol):
    """Contract for data `ai_analyst` needs; mock this in tests."""

    def fetch_trend_context(self, trend_name: str) -> Optional[TrendContext]:
        ...

    def fetch_trend_context_by_id(self, trend_id: int) -> Optional[TrendContext]:
        ...

    def fetch_top_trends(self, limit: int) -> list[dict]:
        ...

    def fetch_user_context(self, user_id: int) -> Optional[UserContext]:
        ...


class SqliteAnalystRepository:
    """SQLite implementation using sync `get_connection()` (same behavior as before refactor)."""

    def fetch_trend_context(self, trend_name: str) -> Optional[TrendContext]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                t.id, t.name, t.category,
                COALESCE(t.strength, 0)                AS strength,
                COALESCE(tm.lifecycle_stage, 'EMERGING') AS lifecycle_stage,
                COALESCE(tm.velocity, 0)               AS velocity,
                COALESCE(tm.predicted_growth_14d, 0)   AS predicted_growth_14d,
                COALESCE(tm.trend_score, 0)            AS trend_score,
                COALESCE(tm.frequency, 0)              AS frequency,
                COALESCE(pi.price_min, 0)              AS price_min,
                COALESCE(pi.price_max, 0)              AS price_max,
                COALESCE(pi.demand_score, 0)           AS demand_score,
                COALESCE(pi.competition_score, 0)      AS competition_score,
                COALESCE(pi.profit_score, 0)           AS profit_score,
                COALESCE(r.suggested_action, 'IGNORE') AS suggested_action,
                COALESCE(r.risk_level, 'MEDIUM')       AS risk_level,
                COALESCE(r.entry_timing, 'WAIT_AND_MONITOR') AS entry_timing,
                COALESCE(r.suggested_inventory, '')    AS suggested_inventory,
                COALESCE(r.reasoning, '')              AS reasoning
            FROM trends t
            LEFT JOIN trend_metrics   tm ON tm.trend_id = t.id
            LEFT JOIN product_insights pi ON pi.trend_id = t.id
            LEFT JOIN recommendations  r  ON r.trend_id  = t.id
            WHERE LOWER(t.name) LIKE ?
            ORDER BY tm.trend_score DESC
            LIMIT 1
            """,
            (f"%{trend_name.strip().lower()}%",),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None

        cols = [d[0] for d in cursor.description]
        d = dict(zip(cols, row))
        trend_id = d["id"]

        cursor.execute(
            "SELECT message FROM alerts WHERE trend_id = ? ORDER BY id DESC LIMIT 5",
            (trend_id,),
        )
        alerts = [r[0] for r in cursor.fetchall()]
        conn.close()

        return TrendContext(
            trend_id=trend_id,
            trend_name=d["name"] or "",
            category=d["category"] or "",
            strength=float(d["strength"]),
            lifecycle_stage=d["lifecycle_stage"],
            velocity=float(d["velocity"]),
            predicted_growth_14d=float(d["predicted_growth_14d"]),
            trend_score=float(d["trend_score"]),
            frequency=int(d["frequency"]),
            price_min=float(d["price_min"]),
            price_max=float(d["price_max"]),
            demand_score=float(d["demand_score"]),
            competition_score=float(d["competition_score"]),
            profit_score=float(d["profit_score"]),
            suggested_action=d["suggested_action"],
            risk_level=d["risk_level"],
            entry_timing=d["entry_timing"],
            suggested_inventory=d["suggested_inventory"],
            reasoning=d["reasoning"],
            alert_messages=alerts,
        )

    def fetch_trend_context_by_id(self, trend_id: int) -> Optional[TrendContext]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                t.id, t.name, t.category,
                COALESCE(t.strength, 0)                AS strength,
                COALESCE(tm.lifecycle_stage, 'EMERGING') AS lifecycle_stage,
                COALESCE(tm.velocity, 0)               AS velocity,
                COALESCE(tm.predicted_growth_14d, 0)   AS predicted_growth_14d,
                COALESCE(tm.trend_score, 0)            AS trend_score,
                COALESCE(tm.frequency, 0)              AS frequency,
                COALESCE(pi.price_min, 0)              AS price_min,
                COALESCE(pi.price_max, 0)              AS price_max,
                COALESCE(pi.demand_score, 0)           AS demand_score,
                COALESCE(pi.competition_score, 0)      AS competition_score,
                COALESCE(pi.profit_score, 0)           AS profit_score,
                COALESCE(r.suggested_action, 'IGNORE') AS suggested_action,
                COALESCE(r.risk_level, 'MEDIUM')       AS risk_level,
                COALESCE(r.entry_timing, 'WAIT_AND_MONITOR') AS entry_timing,
                COALESCE(r.suggested_inventory, '')    AS suggested_inventory,
                COALESCE(r.reasoning, '')              AS reasoning
            FROM trends t
            LEFT JOIN trend_metrics   tm ON tm.trend_id = t.id
            LEFT JOIN product_insights pi ON pi.trend_id = t.id
            LEFT JOIN recommendations  r  ON r.trend_id  = t.id
            WHERE t.id = ?
            LIMIT 1
            """,
            (trend_id,),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return None

        cols = [d[0] for d in cursor.description]
        d = dict(zip(cols, row))
        tid = d["id"]

        cursor.execute(
            "SELECT message FROM alerts WHERE trend_id = ? ORDER BY id DESC LIMIT 5",
            (tid,),
        )
        alerts = [r[0] for r in cursor.fetchall()]
        conn.close()

        return TrendContext(
            trend_id=tid,
            trend_name=d["name"] or "",
            category=d["category"] or "",
            strength=float(d["strength"]),
            lifecycle_stage=d["lifecycle_stage"],
            velocity=float(d["velocity"]),
            predicted_growth_14d=float(d["predicted_growth_14d"]),
            trend_score=float(d["trend_score"]),
            frequency=int(d["frequency"]),
            price_min=float(d["price_min"]),
            price_max=float(d["price_max"]),
            demand_score=float(d["demand_score"]),
            competition_score=float(d["competition_score"]),
            profit_score=float(d["profit_score"]),
            suggested_action=d["suggested_action"],
            risk_level=d["risk_level"],
            entry_timing=d["entry_timing"],
            suggested_inventory=d["suggested_inventory"],
            reasoning=d["reasoning"],
            alert_messages=alerts,
        )

    def fetch_top_trends(self, limit: int) -> list[dict]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                t.name,
                COALESCE(tm.lifecycle_stage, 'EMERGING')  AS lifecycle_stage,
                COALESCE(tm.velocity, 0)                  AS velocity,
                COALESCE(pi.competition_score, 0)         AS competition_score,
                COALESCE(pi.profit_score, 0)              AS profit_score,
                COALESCE(pi.price_min, 0)                 AS price_min,
                COALESCE(pi.price_max, 0)                 AS price_max,
                COALESCE(r.suggested_action, 'IGNORE')    AS suggested_action,
                COALESCE(r.risk_level, 'MEDIUM')          AS risk_level
            FROM trends t
            LEFT JOIN trend_metrics    tm ON tm.trend_id = t.id
            LEFT JOIN product_insights pi ON pi.trend_id = t.id
            LEFT JOIN recommendations   r ON r.trend_id  = t.id
            WHERE r.suggested_action IN ('SELL', 'TEST')
            ORDER BY pi.profit_score DESC, tm.velocity DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = _rows_to_dicts(cursor)
        conn.close()
        return rows

    def fetch_user_context(self, user_id: int) -> Optional[UserContext]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, budget, risk_tolerance, experience_level, preferred_categories "
            "FROM users WHERE id = ?",
            (user_id,),
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        cols = ["id", "name", "budget", "risk_tolerance", "experience_level", "preferred_categories"]
        d = dict(zip(cols, row))
        return UserContext(
            user_id=d["id"],
            name=d["name"],
            budget=float(d["budget"] or 0),
            risk_tolerance=d["risk_tolerance"] or "MEDIUM",
            experience_level=d["experience_level"] or "intermediate",
            preferred_categories=d["preferred_categories"] or "",
        )
