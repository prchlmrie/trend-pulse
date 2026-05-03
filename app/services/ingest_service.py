"""Synchronous raw-signal insert for real-time ingest (invoked via asyncio.to_thread)."""

from datetime import datetime

from app.database import get_connection


def insert_raw_signal(
    source: str,
    content: str,
    engagement: int | None,
    ingestion_channel: str,
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    eng = int(engagement) if engagement is not None else 0
    cursor.execute(
        """
        INSERT INTO raw_data (source, content, engagement, created_at, collected_at, ingestion_channel)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (source, content, eng, now, now, ingestion_channel),
    )
    raw_id = int(cursor.lastrowid)
    conn.commit()
    conn.close()
    return raw_id
