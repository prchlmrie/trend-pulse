from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.common import competition_label


class DashboardService:
    @staticmethod
    async def get_summary(session: AsyncSession) -> dict:
        stage_result = await session.execute(
            text(
                """
                SELECT
                    SUM(CASE WHEN lifecycle_stage = 'EMERGING' THEN 1 ELSE 0 END) AS emerging,
                    SUM(CASE WHEN lifecycle_stage = 'GROWING' THEN 1 ELSE 0 END) AS growing,
                    SUM(CASE WHEN lifecycle_stage = 'PEAKING' THEN 1 ELSE 0 END) AS peaking,
                    SUM(CASE WHEN lifecycle_stage = 'DECLINING' THEN 1 ELSE 0 END) AS declining
                FROM trend_metrics
                """
            )
        )
        stage_row = stage_result.fetchone() or (0, 0, 0, 0)
        lifecycle_counts = {
            "emerging": int(stage_row[0] or 0),
            "growing": int(stage_row[1] or 0),
            "peaking": int(stage_row[2] or 0),
            "declining": int(stage_row[3] or 0),
        }

        top_result = await session.execute(
            text(
                """
                SELECT
                    t.id AS trend_id,
                    t.name AS trend_name,
                    t.image_url AS image_url,
                    COALESCE(tm.velocity, 0) AS velocity,
                    COALESCE(tm.predicted_growth_14d, 0) AS predicted_growth_14d,
                    COALESCE(tm.lifecycle_stage, 'EMERGING') AS lifecycle_stage,
                    COALESCE(tm.trend_score, 0) AS trend_score,
                    COALESCE(pi.competition_score, 0) AS competition_score,
                    COALESCE(pi.profit_score, 0) AS profit_score,
                    COALESCE(pi.price_min, 0) AS price_min,
                    COALESCE(pi.price_max, 0) AS price_max,
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
        )
        cols = list(top_result.keys())
        top_opportunities = []
        for row in top_result.fetchall():
            d = dict(zip(cols, row))
            d["competition_level"] = competition_label(d.get("competition_score"))
            top_opportunities.append(d)

        alerts_result = await session.execute(
            text(
                """
                SELECT id, trend_id, alert_level, message, created_at
                FROM alerts
                ORDER BY id DESC
                LIMIT 12
                """
            )
        )
        alert_cols = list(alerts_result.keys())
        alerts = [dict(zip(alert_cols, row)) for row in alerts_result.fetchall()]

        avg_result = await session.execute(text("SELECT AVG(confidence) FROM user_recommendations"))
        avg_conf = float((avg_result.fetchone() or [0])[0] or 0.0)

        cnt_row = await session.execute(text("SELECT COUNT(*) FROM trends"))
        active_trends_count = int((cnt_row.fetchone() or [0])[0] or 0)

        sum_row = await session.execute(text("SELECT COALESCE(SUM(profit_score), 0) FROM product_insights"))
        total_catalog_profit_potential = float((sum_row.fetchone() or [0])[0] or 0.0)

        return {
            "lifecycle_counts": lifecycle_counts,
            "top_opportunities": top_opportunities,
            "live_alerts": alerts,
            "confidence_score": round(avg_conf * 100, 2),
            "active_trends_count": active_trends_count,
            "total_catalog_profit_potential": round(total_catalog_profit_potential, 2),
        }
