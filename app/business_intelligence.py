import math

from app.database import get_connection


def map_category(trend_name):
    name = trend_name.lower()
    if "hoodie" in name:
        return "hoodies"
    if "tshirt" in name or "t-shirt" in name or "shirt" in name:
        return "tshirts"
    if "bag" in name or "tote" in name or "shoulder" in name:
        return "bags"
    return "general"


def estimate_price_range(product_category):
    ranges = {
        "hoodies": (18.0, 45.0),
        "tshirts": (8.0, 25.0),
        "bags": (12.0, 38.0),
        "general": (10.0, 30.0),
    }
    return ranges.get(product_category, ranges["general"])


def _tokenize(name):
    return [token for token in name.lower().split() if token]


def build_product_insights():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT t.id, t.name, COALESCE(tm.frequency, 0), COALESCE(tm.avg_engagement, 0)
        FROM trends t
        LEFT JOIN trend_metrics tm ON tm.trend_id = t.id
        """
    )
    rows = cursor.fetchall()

    if not rows:
        cursor.execute("DELETE FROM product_insights")
        conn.commit()
        conn.close()
        print("PRODUCT INSIGHTS COMPLETE: 0 insights")
        return

    # Build competition signal from shared keyword overlap.
    token_counts = {}
    trend_tokens = {}
    for trend_id, trend_name, _, _ in rows:
        tokens = set(_tokenize(trend_name))
        trend_tokens[trend_id] = tokens
        for token in tokens:
            token_counts[token] = token_counts.get(token, 0) + 1

    raw_competition = {}
    max_raw = 0.0
    for trend_id, _, _, _ in rows:
        shared = 0
        for token in trend_tokens[trend_id]:
            shared += max(token_counts[token] - 1, 0)
        raw_competition[trend_id] = float(shared)
        max_raw = max(max_raw, float(shared))

    cursor.execute("DELETE FROM product_insights")

    for trend_id, trend_name, frequency, avg_engagement in rows:
        frequency = float(frequency or 0.0)
        avg_engagement = float(avg_engagement or 0.0)

        demand_score = math.log(frequency + 1.0) * avg_engagement
        competition_score = (raw_competition[trend_id] / max_raw) if max_raw > 0 else 0.0
        profit_score = (demand_score / (competition_score + 1.0)) * avg_engagement

        product_category = map_category(trend_name)
        price_min, price_max = estimate_price_range(product_category)

        cursor.execute(
            """
            INSERT INTO product_insights
            (
                trend_id,
                product_category,
                price_min,
                price_max,
                demand_score,
                competition_score,
                profit_score,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                trend_id,
                product_category,
                price_min,
                price_max,
                demand_score,
                competition_score,
                profit_score,
            ),
        )

    conn.commit()
    conn.close()
    print(f"PRODUCT INSIGHTS COMPLETE: {len(rows)} insights")
