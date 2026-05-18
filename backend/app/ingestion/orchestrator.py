"""Compose external API fetches and persist into `raw_data`."""

from __future__ import annotations

from typing import Any

from app.ingestion.config import get_ingestion_settings
from app.ingestion.serpapi_trends import fetch_google_trends_for_keywords
from app.pipeline import run_incremental_pipeline
from app.services.ingest_service import insert_raw_signal


def run_external_api_ingestion(
    keywords: list[str] | None,
    refresh_pipeline: bool,
    geo_override: str | None = None,
) -> dict[str, Any]:
    """
    Phase 1: SerpApi Google Trends → `raw_data` rows, optional incremental pipeline.
    """
    settings = get_ingestion_settings()
    seed = keywords if keywords else None
    kws = [k.strip() for k in (seed or settings.default_keywords) if k.strip()]
    if not kws:
        return {
            "inserted": 0,
            "errors": [],
            "detail": "No keywords provided or configured (INGEST_SEED_KEYWORDS).",
        }

    if not settings.serpapi_key:
        return {
            "inserted": 0,
            "errors": ["SERPAPI_API_KEY is not set"],
            "detail": "Set SERPAPI_API_KEY to enable Google Trends ingestion.",
        }

    if geo_override is not None:
        geo = geo_override.strip() or None
    else:
        geo = settings.google_trends_geo.strip() or None

    fetched = fetch_google_trends_for_keywords(kws, settings.serpapi_key, geo)
    errors: list[str] = []
    inserted = 0
    for row in fetched:
        if row.get("error"):
            errors.append(f"{row.get('keyword')}: {row['error']}")
            continue
        content = (row.get("content") or "").strip()
        if not content:
            errors.append(f"{row.get('keyword')}: empty timeline from API")
            continue
        insert_raw_signal(
            "google_trends_serpapi",
            content,
            int(row.get("engagement") or 0),
            "api:google_trends",
        )
        inserted += 1

    if refresh_pipeline and inserted:
        run_incremental_pipeline()

    detail = f"Ingested {inserted} raw signal(s) from SerpApi Google Trends."
    if errors:
        detail += " " + "; ".join(errors)
    return {"inserted": inserted, "errors": errors, "detail": detail}
