import os
from dataclasses import dataclass


@dataclass(frozen=True)
class IngestionSettings:
    serpapi_key: str
    default_keywords: list[str]
    google_trends_geo: str


def get_ingestion_settings() -> IngestionSettings:
    key = (os.environ.get("SERPAPI_API_KEY") or "").strip()
    raw = (os.environ.get("INGEST_SEED_KEYWORDS") or "streetwear,gadgets,home decor").strip()
    kws = [k.strip() for k in raw.split(",") if k.strip()]
    geo = (os.environ.get("GOOGLE_TRENDS_GEO") or "").strip()
    return IngestionSettings(serpapi_key=key, default_keywords=kws, google_trends_geo=geo)
