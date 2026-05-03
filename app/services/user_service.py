from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class UserService:
    @staticmethod
    async def get_user_recommendations(session: AsyncSession, user_id: int) -> dict:
        user_result = await session.execute(
            text(
                "SELECT id, name, budget, risk_tolerance, preferred_categories, experience_level "
                "FROM users WHERE id = :uid"
            ),
            {"uid": user_id},
        )
        user_row = user_result.mappings().first()
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")

        user = dict(user_row)

        items_result = await session.execute(
            text(
                """
                SELECT
                    ur.id,
                    ur.allocated_budget,
                    ur.expected_return,
                    ur.confidence,
                    ur.status,
                    ur.created_at,
                    r.suggested_action,
                    r.suggested_inventory,
                    r.entry_timing,
                    r.risk_level,
                    r.reasoning,
                    t.id AS trend_id,
                    t.name AS trend_name
                FROM user_recommendations ur
                JOIN recommendations r ON r.id = ur.recommendation_id
                JOIN trends t ON t.id = r.trend_id
                WHERE ur.user_id = :uid
                ORDER BY ur.allocated_budget DESC
                """
            ),
            {"uid": user_id},
        )
        items = [dict(row) for row in items_result.mappings().all()]

        return {"user": user, "items": items}

    @staticmethod
    async def save_opportunity_picks(session: AsyncSession, user_id: int, picks: list[dict]) -> int:
        """Persist finder / what-if picks into user_recommendations (latest recommendation row per trend)."""
        saved = 0
        for p in picks:
            tid = int(p.get("trend_id") or 0)
            if tid <= 0:
                continue
            rec = await session.execute(
                text(
                    "SELECT id FROM recommendations WHERE trend_id = :tid ORDER BY id DESC LIMIT 1"
                ),
                {"tid": tid},
            )
            rid = rec.scalar_one_or_none()
            if rid is None:
                continue
            alloc = float(p.get("allocation") or 0.0)
            ps = float(p.get("profit_score") or 0.0)
            er = max(0.0, round(alloc * (1.0 + min(ps, 120.0) / 200.0), 2))
            conf = min(0.99, max(0.35, 0.5 + min(ps, 100.0) / 250.0))
            await session.execute(
                text(
                    """
                    INSERT INTO user_recommendations
                    (user_id, recommendation_id, allocated_budget, expected_return, confidence, status, created_at)
                    VALUES (:uid, :rid, :alloc, :er, :cf, 'saved_from_finder', datetime('now'))
                    """
                ),
                {"uid": user_id, "rid": int(rid), "alloc": alloc, "er": er, "cf": conf},
            )
            saved += 1
        if saved:
            await session.commit()
        return saved
