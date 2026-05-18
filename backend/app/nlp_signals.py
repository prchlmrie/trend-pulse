"""
NVIDIA-backed sentiment + intent for market signals (preprocess stage).

Falls back to lightweight heuristics when no API key or request fails.
"""

from __future__ import annotations

import json
import re

from app.nvidia_llm import build_nvidia_client, get_default_model, get_nvidia_api_key


def _heuristic_sentiment_intent(text: str) -> tuple[str, str]:
    t = (text or "").lower()
    pos = ("love", "best", "viral", "trending", "fire", "obsessed", "must have", "🔥")
    neg = ("hate", "decline", "dead", "over", "scam", "worst", "avoid", "declining")
    if any(p in t for p in pos):
        sentiment = "positive"
    elif any(p in t for p in neg):
        sentiment = "negative"
    else:
        sentiment = "neutral"

    if any(p in t for p in ("buy", "shop", "price", "deal", "sale", "cart", "order")):
        intent = "purchase_intent"
    elif any(p in t for p in ("style", "outfit", "look", "aesthetic", "inspo", "how to")):
        intent = "style_discovery"
    elif any(p in t for p in ("trend", "viral", "tiktok", "going viral")):
        intent = "trend_awareness"
    else:
        intent = "general"

    return sentiment, intent


def _parse_json_object(raw: str) -> dict | None:
    if not raw or not isinstance(raw, str):
        return None
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def analyze_market_signal(cleaned_text: str) -> dict:
    """
    Classify a cleaned market signal.

    Returns dict with keys: sentiment (positive|neutral|negative), signal_intent (short snake label).
    """
    fallback_s, fallback_i = _heuristic_sentiment_intent(cleaned_text)
    if not get_nvidia_api_key():
        return {"sentiment": fallback_s, "signal_intent": fallback_i}

    client = build_nvidia_client()
    if client is None:
        return {"sentiment": fallback_s, "signal_intent": fallback_i}

    prompt = f"""Classify this short social/commerce signal. Reply with ONE JSON object only, no markdown:
{{"sentiment":"positive|neutral|negative","signal_intent":"purchase_intent|style_discovery|trend_awareness|brand_mention|general"}}

Text:
{cleaned_text[:800]}
"""
    try:
        response = client.chat.completions.create(
            model=get_default_model(),
            messages=[
                {
                    "role": "system",
                    "content": "You output only a single JSON object. Keys: sentiment, signal_intent.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            top_p=0.9,
            max_tokens=256,
            stream=False,
        )
    except Exception:
        return {"sentiment": fallback_s, "signal_intent": fallback_i}

    msg = response.choices[0].message
    content = msg.content if msg else None
    parsed = _parse_json_object(content or "")
    if not parsed:
        return {"sentiment": fallback_s, "signal_intent": fallback_i}

    sentiment = str(parsed.get("sentiment", fallback_s)).lower()
    if sentiment not in ("positive", "neutral", "negative"):
        sentiment = fallback_s

    intent = str(parsed.get("signal_intent", fallback_i)).lower().replace(" ", "_")
    allowed = (
        "purchase_intent",
        "style_discovery",
        "trend_awareness",
        "brand_mention",
        "general",
    )
    if intent not in allowed:
        intent = fallback_i

    return {"sentiment": sentiment, "signal_intent": intent}
