"""Append-only snapshots of trend scores for longitudinal intelligence."""

from app.database import get_connection


def record_trend_intelligence_snapshots() -> None:
    """
    After product insights exist, append one row per trend with current KPIs.
    Safe to call after each pipeline / incremental refresh.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO trend_intelligence_snapshots
            (trend_id, trend_score, profit_score, lifecycle_stage, frequency, recorded_at)
        SELECT
            t.id,
            COALESCE(tm.trend_score, 0),
            COALESCE(pi.profit_score, 0),
            COALESCE(tm.lifecycle_stage, 'EMERGING'),
            COALESCE(tm.frequency, 0),
            datetime('now')
        FROM trends t
        LEFT JOIN trend_metrics tm ON tm.trend_id = t.id
        LEFT JOIN product_insights pi ON pi.trend_id = t.id
        WHERE EXISTS (
            SELECT 1 FROM trend_mentions m WHERE m.trend_id = t.id
        )
        """
    )
    conn.commit()
    conn.close()
    print("TREND INTELLIGENCE SNAPSHOTS: append batch complete")
