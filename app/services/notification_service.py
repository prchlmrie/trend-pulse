from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationService:
    @staticmethod
    async def list_alerts(session: AsyncSession, limit: int) -> list[dict]:
        result = await session.execute(
            text(
                """
                SELECT id, trend_id, alert_level, message, created_at
                FROM alerts
                ORDER BY id DESC
                LIMIT :lim
                """
            ),
            {"lim": limit},
        )
        cols = list(result.keys())
        return [dict(zip(cols, row)) for row in result.fetchall()]
