"""
Semantic trend index (ChromaDB) for AI Analyst RAG-style retrieval.

Embeds trend `name` + `description`; refreshed after `build_trends`.
Set TRENDPULSE_DISABLE_CHROMADB=1 to skip if Chroma is unavailable.
"""

from __future__ import annotations

import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_CHROMA_DIR = _ROOT / ".chroma_analyst"
_COLLECTION = "trends"

_chroma_client = None
_collection = None
_chroma_failed: str | None = None


def vector_search_enabled() -> bool:
    if (os.environ.get("TRENDPULSE_DISABLE_CHROMADB") or "").strip().lower() in ("1", "true", "yes"):
        return False
    return _ensure_chroma() is not None


def _ensure_chroma():
    global _chroma_client, _collection, _chroma_failed
    if _chroma_failed:
        return None
    if _collection is not None:
        return _collection
    try:
        import chromadb
    except ImportError as e:
        _chroma_failed = str(e)
        return None
    try:
        _chroma_client = chromadb.PersistentClient(path=str(_CHROMA_DIR))
        _collection = _chroma_client.get_or_create_collection(
            name=_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
        return _collection
    except Exception as e:
        _chroma_failed = str(e)
        _collection = None
        _chroma_client = None
        return None


def sync_trend_embeddings_from_db() -> int:
    """Rebuild the in-process Chroma collection from SQLite `trends`. Returns number of vectors."""
    from app.database import get_connection

    col = _ensure_chroma()
    if col is None:
        return 0

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, COALESCE(description, ''), COALESCE(category, '') FROM trends")
    rows = cur.fetchall()
    conn.close()

    if not rows:
        existing = col.get()
        if existing and existing.get("ids"):
            col.delete(ids=existing["ids"])
        return 0

    ids = [str(r[0]) for r in rows]
    documents = [f"{r[1]}. {r[2]} Category: {r[3]}".strip() for r in rows]
    metadatas = [{"trend_id": int(r[0]), "name": r[1] or ""} for r in rows]

    try:
        existing = col.get()
        if existing and existing.get("ids"):
            col.delete(ids=existing["ids"])
    except Exception:
        pass
    col.add(ids=ids, documents=documents, metadatas=metadatas)
    return len(ids)


def collection_count() -> int:
    col = _ensure_chroma()
    if col is None:
        return 0
    try:
        return int(col.count())
    except Exception:
        return 0


def query_trends_semantic(query: str, n_results: int = 5) -> list[dict]:
    """
    Return up to `n_results` matches: trend_id, name, distance (lower = closer for cosine space).
    """
    col = _ensure_chroma()
    if col is None or not query.strip():
        return []
    n = max(1, min(int(n_results), 20))
    try:
        res = col.query(query_texts=[query.strip()], n_results=n)
    except Exception:
        return []
    out: list[dict] = []
    ids = (res.get("ids") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    for i, tid in enumerate(ids):
        meta = metas[i] if i < len(metas) else {}
        tid_int = int(meta.get("trend_id") or tid)
        name = str(meta.get("name") or "")
        dist = float(dists[i]) if i < len(dists) else 0.0
        out.append({"trend_id": tid_int, "name": name, "distance": dist})
    return out
