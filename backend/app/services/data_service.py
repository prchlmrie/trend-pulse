from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

TABLE_ORDER: tuple[str, ...] = (
    "raw_data",
    "processed_data",
    "trends",
    "trend_mentions",
    "trend_metrics",
    "product_insights",
    "recommendations",
    "alerts",
    "users",
    "user_recommendations",
    "trend_intelligence_snapshots",
)

ALLOWED_TABLES: frozenset[str] = frozenset(TABLE_ORDER)


class DataService:
    @staticmethod
    async def fetch_table(session: AsyncSession, table_name: str) -> list[dict[str, Any]]:
        if table_name not in ALLOWED_TABLES:
            raise ValueError(f"Invalid table: {table_name}")
        result = await session.execute(text(f"SELECT * FROM {table_name}"))
        cols = list(result.keys())
        return [dict(zip(cols, row)) for row in result.fetchall()]

    @staticmethod
    async def get_data_tables(session: AsyncSession) -> dict[str, list[dict[str, Any]]]:
        return {
            "raw_data": await DataService.fetch_table(session, "raw_data"),
            "processed_data": await DataService.fetch_table(session, "processed_data"),
            "trends": await DataService.fetch_table(session, "trends"),
        }

    @staticmethod
    async def get_all_tables(session: AsyncSession) -> dict[str, list[dict[str, Any]]]:
        return {name: await DataService.fetch_table(session, name) for name in TABLE_ORDER}
