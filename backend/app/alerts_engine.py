from app.database import get_connection


def build_alerts():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            r.trend_id,
            t.name,
            r.suggested_action,
            r.risk_level,
            r.suggested_inventory,
            COALESCE(tm.predicted_growth_14d, 0),
            COALESCE(pi.competition_score, 0)
        FROM recommendations r
        JOIN trends t ON t.id = r.trend_id
        LEFT JOIN trend_metrics tm ON tm.trend_id = r.trend_id
        LEFT JOIN product_insights pi ON pi.trend_id = r.trend_id
        """
    )
    rows = cursor.fetchall()

    cursor.execute("DELETE FROM alerts")

    for trend_id, trend_name, action, risk, inventory, growth_14d, competition in rows:
        if action == "SELL":
            level = "HIGH_OPPORTUNITY"
        elif action == "TEST":
            level = "WATCHLIST"
        else:
            level = "LOW_PRIORITY"

        message = (
            f"{level}: {trend_name} | Predicted growth (14d): {growth_14d:.1f}% | "
            f"Competition: {competition:.2f} | Action: {action} | Risk: {risk} | "
            f"Suggested stock: {inventory}"
        )

        cursor.execute(
            """
            INSERT INTO alerts (trend_id, alert_level, message, created_at)
            VALUES (?, ?, ?, datetime('now'))
            """,
            (trend_id, level, message),
        )

    conn.commit()
    conn.close()
    print(f"ALERTS COMPLETE: {len(rows)} alerts")
