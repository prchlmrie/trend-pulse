import json
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import and_, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ProductInsight, Recommendation, Trend, TrendMetric
from app.services.common import competition_label


class TrendService:
    @staticmethod
    def _trend_list_base_select():
        t, tm, pi, r = Trend, TrendMetric, ProductInsight, Recommendation
        return (
            select(
                t.id,
                t.name,
                t.category,
                t.image_url,
                func.coalesce(t.strength, 0).label("strength"),
                func.coalesce(tm.frequency, 0).label("frequency"),
                func.coalesce(tm.velocity, 0).label("velocity"),
                func.coalesce(tm.predicted_growth_14d, 0).label("predicted_growth_14d"),
                func.coalesce(tm.trend_score, 0).label("trend_score"),
                func.coalesce(tm.lifecycle_stage, "EMERGING").label("lifecycle_stage"),
                func.coalesce(pi.product_category, "general").label("product_category"),
                func.coalesce(pi.competition_score, 0).label("competition_score"),
                func.coalesce(pi.profit_score, 0).label("profit_score"),
                func.coalesce(pi.price_min, 0).label("price_min"),
                func.coalesce(pi.price_max, 0).label("price_max"),
                func.coalesce(r.suggested_action, "IGNORE").label("suggested_action"),
                func.coalesce(r.risk_level, "MEDIUM").label("risk_level"),
                func.coalesce(r.entry_timing, "WAIT_AND_MONITOR").label("entry_timing"),
                func.coalesce(r.suggested_inventory, "").label("suggested_inventory"),
            )
            .select_from(t)
            .outerjoin(tm, tm.trend_id == t.id)
            .outerjoin(pi, pi.trend_id == t.id)
            .outerjoin(r, r.trend_id == t.id)
        )

    @staticmethod
    async def list_trends(
        session: AsyncSession,
        limit: int,
        search: str | None,
        lifecycle_stage: str | None,
        action: str | None,
    ) -> list[dict]:
        stmt = TrendService._trend_list_base_select()
        t, tm, pi, r = Trend, TrendMetric, ProductInsight, Recommendation
        conds = []
        if search:
            conds.append(func.lower(t.name).like(f"%{search.strip().lower()}%"))
        if lifecycle_stage:
            conds.append(
                func.upper(func.coalesce(tm.lifecycle_stage, "")) == lifecycle_stage.strip().upper()
            )
        if action:
            conds.append(func.upper(func.coalesce(r.suggested_action, "")) == action.strip().upper())
        if conds:
            stmt = stmt.where(and_(*conds))
        stmt = stmt.order_by(
            func.coalesce(pi.profit_score, 0).desc(),
            func.coalesce(tm.trend_score, 0).desc(),
        ).limit(limit)

        result = await session.execute(stmt)
        rows = [dict(row._mapping) for row in result.fetchall()]
        for row in rows:
            row["competition_level"] = competition_label(row.get("competition_score"))
        return rows

    @staticmethod
    async def _build_time_series(session: AsyncSession, trend_id: int, days: int) -> dict:
        today = datetime.utcnow().date()
        start = today - timedelta(days=days - 1)
        labels = [(start + timedelta(days=i)).isoformat() for i in range(days)]
        by_day = {label: {"mentions": 0, "engagement": 0.0} for label in labels}

        q = text(
            """
            SELECT substr(r.created_at, 1, 10) AS day,
                   COUNT(*) AS mentions,
                   COALESCE(SUM(r.engagement), 0) AS engagement
            FROM trend_mentions tm
            JOIN processed_data p ON p.id = tm.processed_id
            JOIN raw_data r ON r.id = p.raw_id
            WHERE tm.trend_id = :tid
              AND date(substr(r.created_at, 1, 10)) >= date(:start)
            GROUP BY day
            ORDER BY day
            """
        )
        tr = await session.execute(q, {"tid": trend_id, "start": start.isoformat()})
        for day, mentions, engagement in tr.fetchall():
            if day in by_day:
                by_day[day] = {"mentions": int(mentions or 0), "engagement": float(engagement or 0.0)}

        return {
            "labels": labels,
            "mentions": [by_day[label]["mentions"] for label in labels],
            "engagement": [by_day[label]["engagement"] for label in labels],
        }

    @staticmethod
    async def get_detail(session: AsyncSession, trend_id: int) -> dict:
        t, tm, pi, r = Trend, TrendMetric, ProductInsight, Recommendation
        stmt = (
            select(
                t.id,
                t.name,
                t.category,
                t.image_url,
                func.coalesce(t.strength, 0).label("strength"),
                func.coalesce(tm.frequency, 0).label("frequency"),
                func.coalesce(tm.total_engagement, 0).label("total_engagement"),
                func.coalesce(tm.avg_engagement, 0).label("avg_engagement"),
                func.coalesce(tm.velocity, 0).label("velocity"),
                func.coalesce(tm.predicted_growth_14d, 0).label("predicted_growth_14d"),
                func.coalesce(tm.trend_score, 0).label("trend_score"),
                func.coalesce(tm.lifecycle_stage, "EMERGING").label("lifecycle_stage"),
                func.coalesce(pi.product_category, "general").label("product_category"),
                func.coalesce(pi.price_min, 0).label("price_min"),
                func.coalesce(pi.price_max, 0).label("price_max"),
                func.coalesce(pi.demand_score, 0).label("demand_score"),
                func.coalesce(pi.competition_score, 0).label("competition_score"),
                func.coalesce(pi.profit_score, 0).label("profit_score"),
                func.coalesce(r.suggested_action, "IGNORE").label("suggested_action"),
                func.coalesce(r.suggested_inventory, "").label("suggested_inventory"),
                func.coalesce(r.entry_timing, "WAIT_AND_MONITOR").label("entry_timing"),
                func.coalesce(r.risk_level, "MEDIUM").label("risk_level"),
                func.coalesce(r.reasoning, "").label("reasoning"),
            )
            .select_from(t)
            .outerjoin(tm, tm.trend_id == t.id)
            .outerjoin(pi, pi.trend_id == t.id)
            .outerjoin(r, r.trend_id == t.id)
            .where(t.id == trend_id)
            .limit(1)
        )
        result = await session.execute(stmt)
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Trend not found")

        detail = dict(row._mapping)
        detail["competition_level"] = competition_label(detail.get("competition_score"))
        detail["series_7d"] = await TrendService._build_time_series(session, trend_id, 7)
        detail["series_30d"] = await TrendService._build_time_series(session, trend_id, 30)
        detail["series_90d"] = await TrendService._build_time_series(session, trend_id, 90)

        kw_result = await session.execute(
            text(
                """
                SELECT p.extracted_keywords
                FROM trend_mentions tm
                JOIN processed_data p ON p.id = tm.processed_id
                WHERE tm.trend_id = :tid
                """
            ),
            {"tid": trend_id},
        )
        keyword_cluster: dict[str, int] = {}
        for (raw_keywords,) in kw_result.fetchall():
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

        alert_result = await session.execute(
            text(
                """
                SELECT id, alert_level, message, created_at
                FROM alerts
                WHERE trend_id = :tid
                ORDER BY id DESC
                LIMIT 5
                """
            ),
            {"tid": trend_id},
        )
        acols = list(alert_result.keys())
        detail["alerts"] = [dict(zip(acols, row)) for row in alert_result.fetchall()]

        return detail

    @staticmethod
    async def get_intelligence_history(session: AsyncSession, trend_id: int, limit: int) -> list[dict]:
        chk = await session.execute(text("SELECT 1 FROM trends WHERE id = :tid LIMIT 1"), {"tid": trend_id})
        if chk.fetchone() is None:
            raise HTTPException(status_code=404, detail="Trend not found")

        result = await session.execute(
            text(
                """
                SELECT id, trend_id, trend_score, profit_score, lifecycle_stage, frequency, recorded_at
                FROM trend_intelligence_snapshots
                WHERE trend_id = :tid
                ORDER BY id DESC
                LIMIT :lim
                """
            ),
            {"tid": trend_id, "lim": limit},
        )
        cols = list(result.keys())
        return [dict(zip(cols, row)) for row in result.fetchall()]
