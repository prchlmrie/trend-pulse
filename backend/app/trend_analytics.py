from datetime import datetime, timedelta

from app.database import get_connection


def tag_category(keyword):
    name = keyword.lower()
    if any(token in name for token in ("hoodie", "tshirt", "shirt", "streetwear", "outfit")):
        return "fashion"
    if any(token in name for token in ("bag", "tote", "shoulder", "accessory")):
        return "accessories"
    return "general"


def _parse_iso(ts):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _predict_growth_14d(recent_mentions, previous_mentions):
    # Simple time-series proxy: short-horizon growth extrapolation from last two windows.
    if previous_mentions > 0:
        base_growth = (recent_mentions - previous_mentions) / previous_mentions
    else:
        base_growth = 1.0 if recent_mentions > 0 else 0.0

    # Keep predictions bounded to avoid extreme spikes in tiny datasets.
    bounded = max(-0.8, min(2.0, base_growth))
    return bounded * 100.0


def compute_trend_metrics():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM trend_metrics")
    cursor.execute("SELECT id, name FROM trends")
    trend_rows = cursor.fetchall()

    now = datetime.utcnow()
    last_24h_start = now - timedelta(hours=24)
    prev_24h_start = now - timedelta(hours=48)

    for trend_id, trend_name in trend_rows:
        cursor.execute(
            """
            SELECT tm.mention_count, COALESCE(r.engagement, 0), r.created_at
            FROM trend_mentions tm
            JOIN processed_data p ON tm.processed_id = p.id
            JOIN raw_data r ON p.raw_id = r.id
            WHERE tm.trend_id = ?
            """,
            (trend_id,),
        )
        mentions = cursor.fetchall()

        frequency = sum((row[0] or 0) for row in mentions)
        total_engagement = float(sum((row[1] or 0) for row in mentions))
        avg_engagement = (total_engagement / frequency) if frequency else 0.0

        recent_mentions = 0
        previous_mentions = 0
        for _, _, created_at in mentions:
            created_dt = _parse_iso(created_at)
            if not created_dt:
                continue
            if created_dt >= last_24h_start:
                recent_mentions += 1
            elif prev_24h_start <= created_dt < last_24h_start:
                previous_mentions += 1

        if previous_mentions > 0:
            velocity = recent_mentions / previous_mentions
            growth_rate = (recent_mentions - previous_mentions) / previous_mentions
        else:
            velocity = float(recent_mentions)
            growth_rate = 1.0 if recent_mentions > 0 else 0.0

        predicted_growth_14d = _predict_growth_14d(recent_mentions, previous_mentions)
        trend_score = (total_engagement * 0.6) + (frequency * 0.4)

        if velocity < 0.9 and frequency > 0:
            stage = "DECLINING"
        elif trend_score >= 3000:
            stage = "PEAKING"
        elif trend_score >= 1000:
            stage = "GROWING"
        else:
            stage = "EMERGING"

        category = tag_category(trend_name)

        cursor.execute(
            """
            UPDATE trends
            SET strength = ?, category = ?
            WHERE id = ?
            """,
            (total_engagement, category, trend_id),
        )

        cursor.execute(
            """
            INSERT INTO trend_metrics
            (
                trend_id,
                frequency,
                growth_rate,
                competition_level,
                total_engagement,
                avg_engagement,
                velocity,
                predicted_growth_14d,
                trend_score,
                lifecycle_stage,
                calculated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                trend_id,
                float(frequency),
                growth_rate,
                0.0,
                total_engagement,
                avg_engagement,
                velocity,
                predicted_growth_14d,
                trend_score,
                stage,
            ),
        )

    conn.commit()
    conn.close()

    print("TREND ANALYTICS COMPLETE")
