"""SerpApi Google Trends (JSON API) — stable alternative to scraping."""

from __future__ import annotations

from typing import Any

import httpx

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"


def _parse_timeseries_tail(data: dict[str, Any]) -> tuple[str, int, int]:
    iot = data.get("interest_over_time") or {}
    timeline = iot.get("timeline_data") or []
    if not timeline:
        return "", 0, 0
    last = timeline[-1]
    date_label = (
        last.get("date")
        or last.get("formattedTime")
        or last.get("formattedAxisTime")
        or ""
    )
    values = last.get("values") or []
    total = 0
    for v in values:
        ev = v.get("extracted_value")
        if ev is None and v.get("value") not in (None, ""):
            try:
                ev = int(float(str(v["value"]).replace(",", "")))
            except (TypeError, ValueError):
                ev = 0
        try:
            total += int(ev or 0)
        except (TypeError, ValueError):
            pass
    # Map summed relative scores into engagement column used elsewhere in the app
    engagement = min(max(total * 500, 1), 10_000_000)
    return str(date_label), int(engagement), int(total)


def fetch_google_trends_for_keywords(
    keywords: list[str],
    api_key: str,
    geo: str | None,
) -> list[dict[str, Any]]:
    """
    One SerpApi request per keyword (TIMESERIES).

    Each item: keyword, content, engagement, error (str | None).
    """
    if not api_key:
        return []

    rows: list[dict[str, Any]] = []
    params_base: dict[str, str] = {
        "engine": "google_trends",
        "api_key": api_key,
        "data_type": "TIMESERIES",
    }
    if geo:
        params_base["geo"] = geo

    with httpx.Client(timeout=45.0) as client:
        for kw in keywords:
            params = {**params_base, "q": kw}
            try:
                r = client.get(SERPAPI_SEARCH_URL, params=params)
                r.raise_for_status()
                data = r.json()
            except httpx.HTTPError as e:
                rows.append(
                    {
                        "keyword": kw,
                        "content": "",
                        "engagement": 0,
                        "raw_total": 0,
                        "period_label": "",
                        "error": f"HTTP error: {e}",
                    }
                )
                continue

            err = data.get("error")
            if err:
                rows.append(
                    {
                        "keyword": kw,
                        "content": "",
                        "engagement": 0,
                        "raw_total": 0,
                        "period_label": "",
                        "error": str(err),
                    }
                )
                continue

            date_part, engagement, raw_total = _parse_timeseries_tail(data)
            content = (
                f"Google Trends (SerpApi) | keyword: {kw} | "
                f"relative interest (series tail, model scale): {raw_total} | "
                f"period: {date_part or 'n/a'}"
            )
            rows.append(
                {
                    "keyword": kw,
                    "content": content,
                    "engagement": engagement,
                    "raw_total": int(raw_total),
                    "period_label": str(date_part),
                    "error": None,
                }
            )
    return rows
