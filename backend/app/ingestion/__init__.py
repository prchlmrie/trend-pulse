"""External API ingestion (no HTML scraping in v1)."""

from app.ingestion.orchestrator import run_external_api_ingestion

__all__ = ["run_external_api_ingestion"]
