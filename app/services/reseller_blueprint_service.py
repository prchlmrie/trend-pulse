"""Dual SerpApi fetch (Trends + marketplace site search) + NVIDIA reseller narrative."""

from __future__ import annotations

import json
from typing import Any

from app.ingestion.config import get_ingestion_settings
from app.ingestion.serpapi_google_search import (
    aggregate_price_stats,
    fetch_marketplace_organic_rows,
)
from app.ingestion.serpapi_trends import fetch_google_trends_for_keywords
from app.nvidia_llm import build_nvidia_client, get_default_model

_CONSULTANT_SYSTEM = """You are a Philippines-focused e-commerce reseller consultant for TrendPulse.

Rules:
- Use ONLY facts from the JSON payload. Do not invent prices, seller counts, or search volumes.
- If prices are missing or sparse, say so clearly and focus on demand + next research steps.
- Use ₱ for peso amounts when discussing numbers from the payload.
- Output plain text: 4–7 short bullet lines (no markdown headings, no JSON).
- Mention that buy/sell figures are illustrative estimates when the payload says methodology is heuristic."""


def _resolve_geo(geo: str | None) -> str | None:
    settings = get_ingestion_settings()
    if geo is not None:
        return geo.strip() or None
    return settings.google_trends_geo.strip() or None


def _mock_consultant(facts: dict[str, Any]) -> str:
    d = facts.get("demand") or {}
    m = facts.get("marketplace") or {}
    math = facts.get("reseller_math") or {}
    lines = [
        f"Demand tail (Google Trends relative scale): {d.get('relative_interest_tail', 0)} for period {d.get('trends_period') or 'n/a'}.",
        f"Marketplace listing hits parsed from Google: {m.get('listing_hits', 0)}.",
    ]
    avg = math.get("est_retail_avg_php")
    if avg is not None:
        lines.append(
            f"Observed average list price ≈ ₱{avg:,.0f}; illustrative buy floor ₱{math.get('est_buy_floor_php') or 0:,.0f} "
            f"→ est. profit ₱{math.get('est_profit_per_unit_php') or 0:,.0f} (ROI {math.get('roi_percent') or 0:.1f}%)."
        )
    else:
        lines.append("No reliable ₱ prices parsed from snippets — verify on Shopee/Lazada before buying.")
    lines.append("Set NVIDIA_API_KEY for a fuller AI consultant note.")
    return "\n".join(f"• {x}" for x in lines)


def _consultant_narrative(facts: dict[str, Any]) -> tuple[str, bool]:
    client = build_nvidia_client()
    if client is None:
        return _mock_consultant(facts), True
    try:
        resp = client.chat.completions.create(
            model=get_default_model(),
            messages=[
                {"role": "system", "content": _CONSULTANT_SYSTEM},
                {
                    "role": "user",
                    "content": json.dumps(facts, ensure_ascii=False),
                },
            ],
            temperature=0.45,
            max_tokens=900,
            stream=False,
        )
        text = (resp.choices[0].message.content or "").strip()
        return (text or "Empty consultant response."), False
    except Exception as exc:
        return f"AI narrative failed: {exc}", False


def build_reseller_blueprint(
    keyword: str,
    geo: str | None = None,
    include_lazada: bool = True,
) -> dict[str, Any]:
    kw = (keyword or "").strip()
    errors: list[str] = []
    settings = get_ingestion_settings()
    g_geo = _resolve_geo(geo)

    demand_block: dict[str, Any] = {
        "relative_interest_tail": 0,
        "trends_period": "",
        "geo": g_geo,
    }

    if not kw:
        return {
            "ok": False,
            "keyword": "",
            "mock_ai": True,
            "errors": ["keyword is required"],
            "demand": demand_block,
            "marketplace": {
                "samples": [],
                "prices_php": {"min": None, "max": None, "avg": None, "parsed_quote_count": 0},
                "listing_hits": 0,
                "sources_tried": ["Shopee (Google site:)", "Lazada (Google site:)"] if include_lazada else ["Shopee (Google site:)"],
            },
            "reseller_math": {
                "currency": "PHP",
                "est_retail_avg_php": None,
                "est_buy_floor_php": None,
                "est_profit_per_unit_php": None,
                "roi_percent": None,
                "listing_hits": 0,
                "methodology": "",
            },
            "consultant_note": "Provide a non-empty keyword.",
        }

    if not settings.serpapi_key:
        errors.append("SERPAPI_API_KEY is not set")
        facts_partial = {
            "keyword": kw,
            "demand": demand_block,
            "marketplace": {"listing_hits": 0, "parsed_quote_count": 0},
            "reseller_math": {},
        }
        note, mock = _consultant_narrative(facts_partial)
        return {
            "ok": False,
            "keyword": kw,
            "mock_ai": mock,
            "errors": errors,
            "demand": demand_block,
            "marketplace": {
                "samples": [],
                "prices_php": {"min": None, "max": None, "avg": None, "parsed_quote_count": 0},
                "listing_hits": 0,
                "sources_tried": ["Shopee (Google site:)", "Lazada (Google site:)"] if include_lazada else ["Shopee (Google site:)"],
            },
            "reseller_math": {
                "currency": "PHP",
                "est_retail_avg_php": None,
                "est_buy_floor_php": None,
                "est_profit_per_unit_php": None,
                "roi_percent": None,
                "listing_hits": 0,
                "methodology": "SerpApi key missing — no live fetch.",
            },
            "consultant_note": note,
        }

    trend_rows = fetch_google_trends_for_keywords([kw], settings.serpapi_key, g_geo)
    if trend_rows and trend_rows[0].get("error"):
        errors.append(f"Google Trends: {trend_rows[0]['error']}")
    elif trend_rows:
        tr = trend_rows[0]
        demand_block["relative_interest_tail"] = int(tr.get("raw_total") or 0)
        demand_block["trends_period"] = str(tr.get("period_label") or "")

    m_rows, m_errs = fetch_marketplace_organic_rows(
        kw,
        settings.serpapi_key,
        include_lazada=include_lazada,
        gl="ph",
        num_per_query=8,
    )
    errors.extend(m_errs)

    _, stats = aggregate_price_stats(m_rows)
    avg = stats.get("avg")
    min_p = stats.get("min")
    max_p = stats.get("max")
    count = int(stats.get("count") or 0)

    est_buy = None
    est_profit = None
    roi = None
    methodology = (
        "Retail average is mean of ₱/PHP amounts parsed from Google result titles/snippets for "
        "Shopee/Lazada site-restricted searches (no guarantee every hit is a product price). "
        "Buy floor uses a fixed 0.55× retail average as an illustrative sourcing anchor — replace with your real COGS."
    )
    if avg is not None:
        est_buy = round(float(avg) * 0.55, 2)
        est_profit = round(float(avg) - float(est_buy), 2)
        if est_buy > 0:
            roi = round((est_profit / est_buy) * 100.0, 2)

    samples_out = []
    for row in m_rows[:6]:
        samples_out.append(
            {
                "title": row.get("title") or "",
                "snippet": row.get("snippet") or "",
                "link": row.get("link"),
                "source_label": row.get("source_label") or "",
            }
        )

    sources_tried = ["Shopee (Google site:)"]
    if include_lazada:
        sources_tried.append("Lazada (Google site:)")

    reseller_math = {
        "currency": "PHP",
        "est_retail_avg_php": float(avg) if avg is not None else None,
        "est_buy_floor_php": float(est_buy) if est_buy is not None else None,
        "est_profit_per_unit_php": float(est_profit) if est_profit is not None else None,
        "roi_percent": float(roi) if roi is not None else None,
        "listing_hits": len(m_rows),
        "methodology": methodology,
    }

    facts = {
        "keyword": kw,
        "demand": demand_block,
        "marketplace": {
            "listing_hits": len(m_rows),
            "parsed_quote_count": count,
            "prices_min": min_p,
            "prices_max": max_p,
            "prices_avg": avg,
        },
        "reseller_math": reseller_math,
    }
    note, mock_ai = _consultant_narrative(facts)

    return {
        "ok": True,
        "keyword": kw,
        "mock_ai": mock_ai,
        "errors": errors,
        "demand": demand_block,
        "marketplace": {
            "samples": samples_out,
            "prices_php": {
                "min": float(min_p) if min_p is not None else None,
                "max": float(max_p) if max_p is not None else None,
                "avg": float(avg) if avg is not None else None,
                "parsed_quote_count": count,
            },
            "listing_hits": len(m_rows),
            "sources_tried": sources_tried,
        },
        "reseller_math": reseller_math,
        "consultant_note": note,
    }
