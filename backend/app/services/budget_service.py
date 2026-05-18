from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class BudgetService:
    @staticmethod
    async def recommend_for_budget(
        session: AsyncSession, budget: float, top_n: int = 3
    ) -> tuple[list[dict], float]:
        result = await session.execute(
            text(
                """
                SELECT
                    t.id,
                    t.name,
                    t.image_url,
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
        )
        rows = result.fetchall()

        picks: list[dict] = []
        remaining = float(budget)

        def _append_pick(row) -> bool:
            nonlocal remaining
            trend_id, name, image_url, category, price_min, price_max, profit_score, action, risk = row
            pm, px = float(price_min or 0.0), float(price_max or 0.0)
            retail_mid = (pm + px) / 2 if px > 0 else pm
            if retail_mid <= 0:
                retail_mid = max(149.0, min(3999.0, (float(profit_score or 0.0) + 100) ** 0.5 * 18))
            est_unit_cost = max(1.0, round(retail_mid * 0.48, 2))
            max_units = int(remaining // est_unit_cost)
            if max_units <= 0:
                return False
            act = (action or "TEST").upper()
            units = min(max_units, 30 if act == "SELL" else 15)
            allocation = round(units * est_unit_cost, 2)
            remaining -= allocation
            picks.append(
                {
                    "trend_id": int(trend_id),
                    "trend_name": name,
                    "image_url": image_url,
                    "category": category,
                    "action": act,
                    "risk": risk,
                    "units": units,
                    "allocation": allocation,
                    "profit_score": round(float(profit_score or 0.0), 2),
                }
            )
            return True

        for row in rows:
            if len(picks) >= top_n:
                break
            _append_pick(row)

        if not picks:
            fallback = await session.execute(
                text(
                    """
                    SELECT
                        t.id, t.name, t.image_url, pi.product_category,
                        pi.price_min, pi.price_max, pi.profit_score,
                        COALESCE(r.suggested_action, 'TEST'), COALESCE(r.risk_level, 'MEDIUM')
                    FROM product_insights pi
                    JOIN trends t ON t.id = pi.trend_id
                    LEFT JOIN recommendations r ON r.trend_id = pi.trend_id
                    ORDER BY pi.profit_score DESC
                    LIMIT 50
                    """
                )
            )
            for row in fallback.fetchall():
                if len(picks) >= top_n:
                    break
                _append_pick(row)

        return picks, round(max(0.0, remaining), 2)
