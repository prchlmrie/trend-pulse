"""SerpApi Google Search JSON — marketplace hints via `site:` (API, not HTML scraping)."""

from __future__ import annotations

import re
from typing import Any

import httpx

from app.ingestion.serpapi_trends import SERPAPI_SEARCH_URL


def fetch_google_organic(
    query: str,
    api_key: str,
    *,
    gl: str = "ph",
    hl: str = "en",
    num: int = 10,
    google_domain: str = "google.com.ph",
) -> dict[str, Any]:
    """
    Returns ``{"organic": [...], "error": str|None}``.
    Each organic item: title, snippet, link, source_label (optional).
    """
    if not api_key:
        return {"organic": [], "error": "missing_api_key"}

    params = {
        "engine": "google",
        "q": query,
        "api_key": api_key,
        "gl": gl,
        "hl": hl,
        "num": str(num),
        "google_domain": google_domain,
    }
    try:
        with httpx.Client(timeout=45.0) as client:
            r = client.get(SERPAPI_SEARCH_URL, params=params)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        return {"organic": [], "error": str(e)}

    err = data.get("error")
    if err:
        return {"organic": [], "error": str(err)}

    organic: list[dict[str, Any]] = []
    for row in data.get("organic_results") or []:
        organic.append(
            {
                "title": str(row.get("title") or ""),
                "snippet": str(row.get("snippet") or ""),
                "link": str(row.get("link") or "") or None,
            }
        )
    return {"organic": organic, "error": None}


def marketplace_site_queries(keyword: str, include_lazada: bool) -> list[tuple[str, str]]:
    """(search_query_suffix or full query helper, source_label)."""
    kw = keyword.strip()
    sites: list[tuple[str, str]] = [(f"{kw} site:shopee.ph", "Shopee (Google site:)")]
    if include_lazada:
        sites.append((f"{kw} site:lazada.com.ph", "Lazada (Google site:)"))
    return sites


def fetch_marketplace_organic_rows(
    keyword: str,
    api_key: str,
    *,
    include_lazada: bool = True,
    gl: str = "ph",
    num_per_query: int = 8,
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Aggregate organic rows from Google searches restricted to marketplace hostnames.

    Returns (rows, errors) where each row has title, snippet, link, source_label.
    """
    errors: list[str] = []
    out: list[dict[str, Any]] = []
    for q, label in marketplace_site_queries(keyword, include_lazada):
        pack = fetch_google_organic(q, api_key, gl=gl, num=num_per_query)
        if pack.get("error"):
            errors.append(f"{label}: {pack['error']}")
            continue
        for row in pack.get("organic") or []:
            out.append({**row, "source_label": label})
    return out, errors


_PESO = re.compile(r"₱\s*([\d]{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)")
_PHP_WORD = re.compile(r"PHP\s*:?\s*([\d]{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)", re.IGNORECASE)


def extract_php_prices_from_text(text: str) -> list[float]:
    """Pull peso amounts from titles/snippets (best-effort)."""
    if not text:
        return []
    found: list[float] = []
    for rx in (_PESO, _PHP_WORD):
        for m in rx.finditer(text):
            raw = m.group(1).replace(",", "")
            try:
                v = float(raw)
                if 1 <= v <= 10_000_000:
                    found.append(v)
            except ValueError:
                continue
    return found


def aggregate_price_stats(rows: list[dict[str, Any]]) -> tuple[list[float], dict[str, float | int | None]]:
    """Flatten prices from all row text fields."""
    all_prices: list[float] = []
    for row in rows:
        blob = f"{row.get('title','')} {row.get('snippet','')}"
        all_prices.extend(extract_php_prices_from_text(blob))
    if not all_prices:
        return [], {"min": None, "max": None, "avg": None, "count": 0}
    return all_prices, {
        "min": min(all_prices),
        "max": max(all_prices),
        "avg": sum(all_prices) / len(all_prices),
        "count": len(all_prices),
    }
