from app.database import get_connection


def recommend_for_budget(budget, top_n=3):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            t.name,
            pi.product_category,
            pi.price_min,
            pi.price_max,
            pi.profit_score,
            r.suggested_action,
            r.risk_level
        FROM product_insights pi
        JOIN trends t ON t.id = pi.trend_id
        LEFT JOIN recommendations r ON r.trend_id = pi.trend_id
        WHERE r.suggested_action IN ('SELL', 'TEST')
        ORDER BY pi.profit_score DESC
        """
    )
    rows = cursor.fetchall()

    picks = []
    remaining = float(budget)
    for name, category, price_min, price_max, profit_score, action, risk in rows:
        est_unit_cost = float(price_max or 0.0)
        if est_unit_cost <= 0:
            continue

        max_units = int(remaining // est_unit_cost)
        if max_units <= 0:
            continue

        units = min(max_units, 30 if action == "SELL" else 15)
        allocation = units * est_unit_cost
        remaining -= allocation

        picks.append(
            {
                "trend_name": name,
                "category": category,
                "action": action,
                "risk": risk,
                "units": units,
                "allocation": round(allocation, 2),
                "profit_score": round(float(profit_score or 0.0), 2),
            }
        )

        if len(picks) >= top_n:
            break

    conn.close()
    return picks, round(remaining, 2)
