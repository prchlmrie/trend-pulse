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
        for trend_id, name, image_url, category, price_min, price_max, profit_score, action, risk in rows:
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
                    "trend_id": int(trend_id),
                    "trend_name": name,
                    "image_url": image_url,
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

        return picks, round(remaining, 2)
