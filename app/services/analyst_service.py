import asyncio

from app.ai_analyst import ask_analyst
from app.repositories import SqliteAnalystRepository


class AnalystService:
    @staticmethod
    async def ask(question: str, user_id: int | None) -> dict:
        return await asyncio.to_thread(ask_analyst, question, user_id, SqliteAnalystRepository())
