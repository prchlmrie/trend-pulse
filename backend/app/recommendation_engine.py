from app.database import get_connection


def _inventory_units(action, risk_level):
    if action == "SELL" and risk_level == "LOW":
        return "25-40 units"
    if action == "SELL":
        return "15-25 units"
    if action == "TEST":
        return "10-20 units"
    return "0-5 units"


def _entry_timing(action, predicted_growth_14d):
    if action == "SELL" and predicted_growth_14d >= 0:
        return "ENTER_NOW"
    if action == "TEST":
        return "START_SMALL_THIS_WEEK"
    return "WAIT_AND_MONITOR"


def build_recommendations():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            pi.trend_id,
            t.name,
            pi.product_category,
            COALESCE(pi.demand_score, 0),
            COALESCE(pi.competition_score, 0),
            COALESCE(pi.profit_score, 0),
            COALESCE(tm.predicted_growth_14d, 0)
        FROM product_insights pi
        JOIN trends t ON t.id = pi.trend_id
        LEFT JOIN trend_metrics tm ON tm.trend_id = pi.trend_id
        """
    )
    rows = cursor.fetchall()

    cursor.execute("DELETE FROM recommendations")

    for (
        trend_id,
        trend_name,
        product_category,
        demand_score,
        competition_score,
        profit_score,
        predicted_growth_14d,
    ) in rows:
        if profit_score > 5000 and competition_score < 0.5:
            action = "SELL"
        elif profit_score > 5000:
            action = "TEST"
        elif 2000 < profit_score <= 5000:
            action = "TEST"
        else:
            action = "IGNORE"

        if competition_score > 0.7:
            risk_level = "HIGH"
        elif competition_score > 0.4:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        entry_timing = _entry_timing(action, predicted_growth_14d)
        units = _inventory_units(action, risk_level)
        suggested_inventory = f"{product_category}: {units}"

        reasoning = (
            f"{trend_name}: demand={demand_score:.1f}, competition={competition_score:.2f}, "
            f"profit={profit_score:.1f}, forecast_14d={predicted_growth_14d:.1f}%. "
            f"{action} with {risk_level} risk; suggested stock {units}."
        )

        cursor.execute(
            """
            INSERT INTO recommendations
            (
                trend_id,
                profit_score,
                suggested_action,
                suggested_inventory,
                entry_timing,
                risk_level,
                reasoning,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                trend_id,
                profit_score,
                action,
                suggested_inventory,
                entry_timing,
                risk_level,
                reasoning,
            ),
        )

    conn.commit()
    conn.close()
    print(f"RECOMMENDATIONS COMPLETE: {len(rows)} decisions")
