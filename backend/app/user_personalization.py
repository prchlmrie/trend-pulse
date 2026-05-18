import json

from app.database import get_connection


RISK_ORDER = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
EXPERIENCE_MAX_POSITIONS = {
    "beginner": 2,
    "intermediate": 3,
    "reseller": 4,
    "business owner": 5,
}


def _parse_categories(raw_value):
    if not raw_value:
        return set()
    if isinstance(raw_value, str):
        text = raw_value.strip()
        if not text:
            return set()
        try:
            decoded = json.loads(text)
            if isinstance(decoded, list):
                return {str(x).strip().lower() for x in decoded if str(x).strip()}
        except json.JSONDecodeError:
            pass
        return {part.strip().lower() for part in text.split(",") if part.strip()}
    return set()


def _risk_allowed(user_risk, rec_risk):
    user_level = RISK_ORDER.get((user_risk or "MEDIUM").upper(), 2)
    rec_level = RISK_ORDER.get((rec_risk or "MEDIUM").upper(), 2)
    return rec_level <= user_level


def _action_allowed(experience_level, action):
    level = (experience_level or "beginner").lower()
    if level == "beginner":
        return action in ("SELL", "TEST")
    return action in ("SELL", "TEST")


def _compute_confidence(action, competition_score, predicted_growth_14d, lifecycle_stage):
    base = 0.55
    if action == "SELL":
        base += 0.15
    if lifecycle_stage == "PEAKING":
        base += 0.1
    if lifecycle_stage == "DECLINING":
        base -= 0.2
    base += max(-0.15, min(0.15, predicted_growth_14d / 1000.0))
    base -= min(0.25, competition_score * 0.25)
    return round(max(0.05, min(0.98, base)), 3)


def _expected_return_multiplier(action, confidence, experience_level):
    base = 1.08 if action == "SELL" else 1.03
    if (experience_level or "").lower() in ("reseller", "business owner"):
        base += 0.03
    return base + (confidence - 0.5) * 0.1


def build_user_recommendations():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, name, COALESCE(budget, 0), COALESCE(risk_tolerance, 'MEDIUM'),
               preferred_categories, COALESCE(experience_level, 'beginner')
        FROM users
        """
    )
    users = cursor.fetchall()

    cursor.execute(
        """
        SELECT
            r.id,
            r.trend_id,
            r.suggested_action,
            r.risk_level,
            COALESCE(r.profit_score, 0),
            COALESCE(pi.product_category, 'general'),
            COALESCE(pi.competition_score, 0),
            COALESCE(tm.predicted_growth_14d, 0),
            COALESCE(tm.lifecycle_stage, 'EMERGING')
        FROM recommendations r
        LEFT JOIN product_insights pi ON pi.trend_id = r.trend_id
        LEFT JOIN trend_metrics tm ON tm.trend_id = r.trend_id
        """
    )
    recommendation_rows = cursor.fetchall()

    cursor.execute("DELETE FROM user_recommendations")

    for user_id, _, budget, risk_tolerance, preferred_categories, experience_level in users:
        budget = float(budget or 0.0)
        if budget <= 0:
            continue

        categories = _parse_categories(preferred_categories)
        max_positions = EXPERIENCE_MAX_POSITIONS.get((experience_level or "").lower(), 3)

        candidates = []
        for row in recommendation_rows:
            (
                recommendation_id,
                _trend_id,
                action,
                rec_risk,
                profit_score,
                product_category,
                competition_score,
                predicted_growth_14d,
                lifecycle_stage,
            ) = row

            if not _risk_allowed(risk_tolerance, rec_risk):
                continue
            if not _action_allowed(experience_level, action):
                continue
            if categories and product_category.lower() not in categories and "general" not in categories:
                continue

            confidence = _compute_confidence(
                action, float(competition_score), float(predicted_growth_14d), lifecycle_stage
            )
            candidates.append(
                {
                    "recommendation_id": recommendation_id,
                    "action": action,
                    "profit_score": float(profit_score),
                    "confidence": confidence,
                    "experience_level": experience_level,
                }
            )

        if not candidates:
            continue

        candidates.sort(key=lambda item: item["profit_score"], reverse=True)
        selected = candidates[:max_positions]

        total_profit_score = sum(item["profit_score"] for item in selected) or 1.0
        remaining_budget = budget

        for index, item in enumerate(selected):
            if index == len(selected) - 1:
                allocated = max(0.0, remaining_budget)
            else:
                weight = item["profit_score"] / total_profit_score
                allocated = round(budget * weight, 2)
                allocated = min(allocated, remaining_budget)
            remaining_budget = round(max(0.0, remaining_budget - allocated), 2)

            multiplier = _expected_return_multiplier(
                item["action"], item["confidence"], item["experience_level"]
            )
            expected_return = round(allocated * multiplier, 2)

            cursor.execute(
                """
                INSERT INTO user_recommendations
                (
                    user_id,
                    recommendation_id,
                    allocated_budget,
                    expected_return,
                    confidence,
                    status,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    user_id,
                    item["recommendation_id"],
                    allocated,
                    expected_return,
                    item["confidence"],
                    "PENDING",
                ),
            )

    conn.commit()
    conn.close()
    print("USER PERSONALIZATION COMPLETE")
