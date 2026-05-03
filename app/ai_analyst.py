"""
ai_analyst.py  —  TrendPulse

The AI Analyst turns a natural-language user question into a data-grounded
answer by:

  1. Parsing the question to detect intent and any mentioned trend name.
  2. Querying the SQLite DB to build a rich "context block" of live metrics.
  3. Injecting that context into a structured system prompt.
  4. Calling the NVIDIA Integrate API (or mock fallback) and returning the response.

Supported question intents
---------------------------
  RISK_EXPLANATION    — "Why is the risk HIGH for X?"
  BUDGET_STRATEGY     — "Generate a retail strategy for ₱N / $N budget on X"
  ACTION_EXPLANATION  — "Why is X marked TEST instead of SELL?"
  OUTLOOK_FORECAST    — "What is the 14-day outlook for X?"
  PROFILE_ADVICE      — "I'm a beginner with ₱10,000. What's my best move?"
  GENERAL             — fallback for anything else

Usage
-----
    from app.ai_analyst import ask_analyst
    from app.repositories import SqliteAnalystRepository

    result = ask_analyst("Why is X risk HIGH?", user_id=1, repository=SqliteAnalystRepository())
    # → {"answer": "...", "intent": "RISK_EXPLANATION", "trend": "X", "sources": [...]}
"""

from __future__ import annotations

import re
from typing import Optional

from app.ai_analyst_agent import run_analyst_agent
from app.analyst_context import TrendContext, UserContext
from app.repositories import SqliteAnalystRepository
from app.repositories.analyst_repository import AnalystRepository
from app.trend_vector_index import (
    collection_count,
    query_trends_semantic,
    sync_trend_embeddings_from_db,
    vector_search_enabled,
)
from app.nvidia_llm import (
    analyst_extra_body,
    analyst_max_tokens,
    build_nvidia_client,
    get_default_model,
    nvidia_stream_chat_text,
)

# ── NVIDIA client (mock when no key or OpenAI SDK missing) ──────────────────

_nv_client = build_nvidia_client()
_USE_MOCK = _nv_client is None


# ── intent detection ──────────────────────────────────────────────────────────

_INTENT_PATTERNS: list[tuple[str, str]] = [
    (r"\brisk\b.*(why|explain|high|low|medium)", "RISK_EXPLANATION"),
    (r"why.*\brisk\b", "RISK_EXPLANATION"),
    (r"(strategy|plan|budget|invest|allocate).*([\$\d₱]|php)", "BUDGET_STRATEGY"),
    (r"([\$\d₱]|php).*(strategy|plan|budget|invest)", "BUDGET_STRATEGY"),
    (r"why.*(test|sell|ignore|action)", "ACTION_EXPLANATION"),
    (r"(test|sell|ignore).*(instead|not|vs)", "ACTION_EXPLANATION"),
    (r"(outlook|forecast|predict|next.*day|14.day|30.day|growth)", "OUTLOOK_FORECAST"),
    (r"(beginner|entry.level|small budget|low risk|new.*seller|best move)", "PROFILE_ADVICE"),
    (r"(recommend|what.*buy|what.*sell|suggest).*(me|my)", "PROFILE_ADVICE"),
]


def _detect_intent(question: str) -> str:
    q = question.lower()
    for pattern, intent in _INTENT_PATTERNS:
        if re.search(pattern, q):
            return intent
    return "GENERAL"


def _extract_trend_name(question: str) -> str:
    """
    Heuristic: quotes, Title Case after lead-ins, then conversational phrases
    (e.g. "Tell me about Eco Activewear") — works with lowercase names via SQL LIKE.
    """
    # Quoted name
    m = re.search(r"['\"]([^'\"]{3,60})['\"]", question)
    if m:
        return m.group(1).strip()

    # Title Case after for / of / about / on / trend
    m = re.search(
        r"\b(?:for|of|about|on|trend)\s+([A-Z][a-zA-Z\-]+(?:\s+[A-Z][a-zA-Z\-]+){0,4})",
        question,
    )
    if m:
        return m.group(1).strip()

    # Conversational: "tell me about X", "what about X", "what is X", etc.
    m = re.search(
        r"\b(?:tell\s+me\s+about|what\s+about|what(?:'s|\s+is)|info(?:rmation)?\s+on|details\s+on|"
        r"learn\s+about|explain|discuss|look\s+at)\s+([A-Za-z0-9][^.?\n]{2,100})",
        question,
        re.I,
    )
    if m:
        chunk = m.group(1).strip().strip("\"'.,; ")
        chunk = re.sub(r"\s+(please|thanks|today|now)\s*$", "", chunk, flags=re.I)
        if len(chunk) >= 2:
            return chunk

    return ""


def _extract_trend_name_llm(question: str) -> str:
    """Short non-streaming completion to pull a trend phrase from free-form text."""
    if _USE_MOCK or _nv_client is None:
        return ""
    try:
        resp = _nv_client.chat.completions.create(
            model=get_default_model(),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract the single product or trend the user is asking about. "
                        "Reply with ONLY that name (max 8 words), no quotes, or the word NONE."
                    ),
                },
                {"role": "user", "content": question[:2000]},
            ],
            temperature=0.15,
            max_tokens=48,
            stream=False,
        )
        raw = (resp.choices[0].message.content or "").strip()
        raw = raw.strip('"\'')
        raw = raw.split("\n")[0].split("---")[0].strip()
        if not raw or raw.upper() in ("NONE", "N/A", "NULL"):
            return ""
        return raw[:120]
    except Exception:
        return ""


def _candidate_trend_names(question: str) -> list[str]:
    """Ordered unique name guesses: regex heuristics, then optional LLM phrase."""
    seen: set[str] = set()
    out: list[str] = []

    def add(s: str) -> None:
        t = (s or "").strip()
        if len(t) < 2:
            return
        key = t.lower()
        if key in seen:
            return
        seen.add(key)
        out.append(t)

    add(_extract_trend_name(question))
    llm_guess = _extract_trend_name_llm(question)
    add(llm_guess)
    return out


def _extract_budget(question: str) -> Optional[float]:
    q = question.strip()
    m = re.search(r"₱\s*([\d,]+(?:\.\d+)?)", q)
    if m:
        return float(m.group(1).replace(",", ""))
    m = re.search(r"(?:PHP|Php)\s*([\d,]+(?:\.\d+)?)", q)
    if m:
        return float(m.group(1).replace(",", ""))
    m = re.search(r"\b(?:pesos?|peso)\b\s*([\d,]+(?:\.\d+)?)", q, re.I)
    if m:
        return float(m.group(1).replace(",", ""))
    m = re.search(r"\$\s*([\d,]+)", q)
    if m:
        return float(m.group(1).replace(",", ""))
    return None


def _resolve_trend_context(
    question: str,
    repository: AnalystRepository,
) -> tuple[Optional[TrendContext], str, bool]:
    """
    Resolve a trend: try each name candidate (regex + optional LLM), then Chroma on the full question.
    If a regex guess fails SQL match, we still fall through to semantic search (fixes partial/wrong guesses).
    """
    hint = ""
    for name_guess in _candidate_trend_names(question):
        hint = name_guess or hint
        ctx = repository.fetch_trend_context(name_guess)
        if ctx:
            return ctx, name_guess, False

    if vector_search_enabled():
        for hit in query_trends_semantic(question.strip(), n_results=6):
            ctx = repository.fetch_trend_context_by_id(int(hit["trend_id"]))
            if ctx:
                return ctx, ctx.trend_name or hint or "", True
    return None, hint or "", False


# ── system prompt builder ─────────────────────────────────────────────────────

_SYSTEM_PROMPT_BASE = """You are TrendPulse AI, an expert market intelligence analyst for \
the Philippines — Shopee, Lazada, TikTok Shop, and social commerce (COD, budol finds, NCR/province shipping).

Assume budgets and product prices in the context block are in Philippine pesos (PHP) unless explicitly stated otherwise.

Your job is to answer the user's question using ONLY the live data provided below. \
Do not invent numbers, scores, or trends. If the data does not contain what you need, \
say so clearly.

Tone: confident, data-driven, concise. Use bullet points for multi-step recommendations. \
Always cite specific scores or metrics from the data when making a claim.

{context_block}
"""


def _build_system_prompt(
    intent: str,
    trend_ctx: Optional[TrendContext],
    user_ctx: Optional[UserContext],
    top_trends: Optional[list[dict]],
    budget: Optional[float],
) -> str:
    parts: list[str] = []

    if trend_ctx:
        parts.append(trend_ctx.to_prompt_block())

    if user_ctx:
        parts.append(user_ctx.to_prompt_block())

    if top_trends:
        lines = ["=== TOP ACTIONABLE TRENDS ==="]
        for t in top_trends:
            comp = "LOW" if t["competition_score"] < 0.34 else ("MEDIUM" if t["competition_score"] < 0.67 else "HIGH")
            lines.append(
                f"  • {t['name']} | {t['lifecycle_stage']} | "
                f"Velocity {t['velocity']:.2f} | Competition {comp} | "
                f"Profit {t['profit_score']:.2f} | Action: {t['suggested_action']} | "
                f"Price ₱{t['price_min']:,.0f}–₱{t['price_max']:,.0f}"
            )
        parts.append("\n".join(lines))

    if budget is not None:
        parts.append(f"=== BUDGET CONTEXT ===\nUser's stated budget: ₱{budget:,.2f} PHP")

    context_block = "\n\n".join(parts) if parts else "No specific trend data found in database."
    return _SYSTEM_PROMPT_BASE.format(context_block=context_block)


# ── mock response (for local dev without API key) ─────────────────────────────

def _mock_response(intent: str, trend_ctx: Optional[TrendContext], question: str) -> str:
    if trend_ctx:
        t = trend_ctx
        if intent == "RISK_EXPLANATION":
            return (
                f"[MOCK] The '{t.trend_name}' trend has a risk level of **{t.risk_level}**. "
                f"Competition score is {t.competition_score:.2f} ({t.competition_label}), "
                f"profit score is {t.profit_score:.2f}, and velocity is {t.velocity:.2f}. "
                f"Entry timing recommendation: {t.entry_timing}. "
                f"System reasoning: {t.reasoning or 'N/A'}."
            )
        if intent == "OUTLOOK_FORECAST":
            return (
                f"[MOCK] '{t.trend_name}' is projected to grow +{t.predicted_growth_14d:.1f}% "
                f"over the next 14 days. Current stage: {t.lifecycle_stage}, "
                f"velocity: {t.velocity:.2f}, trend score: {t.trend_score:.2f}."
            )
        if intent == "ACTION_EXPLANATION":
            return (
                f"[MOCK] '{t.trend_name}' is marked **{t.suggested_action}** because "
                f"competition score is {t.competition_score:.2f} ({t.competition_label}) "
                f"and profit score is {t.profit_score:.2f}. "
                f"Entry timing: {t.entry_timing}."
            )
    return (
        f"[MOCK] Intent detected: {intent}. "
        f"Set NVIDIA_API_KEY in your environment to enable live NVIDIA model responses. "
        f"Your question was: '{question}'"
    )


def _call_nvidia_chat(system_prompt: str, question: str) -> str:
    kwargs: dict = {
        "model": get_default_model(),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        "temperature": 0.6,
        "top_p": 0.95,
        "max_tokens": analyst_max_tokens(),
    }
    extra = analyst_extra_body()
    if extra:
        kwargs["extra_body"] = extra
    return nvidia_stream_chat_text(_nv_client, **kwargs)


# ── public API ────────────────────────────────────────────────────────────────

def ask_analyst(
    question: str,
    user_id: Optional[int] = None,
    repository: AnalystRepository | None = None,
) -> dict:
    """
    Main entry point called from the FastAPI endpoint.

    Parameters
    ----------
    question : str
        The user's natural-language question.
    user_id : int | None
        If provided, enriches the context with the user's profile.
    repository : AnalystRepository | None
        Data access implementation. Defaults to :class:`SqliteAnalystRepository`
        when omitted; inject a mock for unit tests.

    Returns
    -------
    dict with keys:
        answer  : str   — AI-generated response
        intent  : str   — detected question intent
        trend   : str   — extracted trend name (may be empty)
        sources : list  — list of data source labels used
    """
    repo: AnalystRepository = repository or SqliteAnalystRepository()

    question = question.strip()
    if vector_search_enabled() and collection_count() == 0:
        sync_trend_embeddings_from_db()

    if not _USE_MOCK:
        try:
            return run_analyst_agent(_nv_client, question, user_id, repo)
        except Exception:
            pass

    intent = _detect_intent(question)
    budget = _extract_budget(question)

    trend_ctx, trend_hint, used_semantic = _resolve_trend_context(question, repo)

    user_ctx: Optional[UserContext] = None
    top_trends: Optional[list[dict]] = None
    sources: list[str] = []

    if trend_ctx:
        sources.append(f"trend: {trend_ctx.trend_name}")
        sources.append("trend_metrics")
        sources.append("product_insights")
        sources.append("recommendations")
        if used_semantic:
            sources.append("vector_index:chromadb")
        if trend_ctx.alert_messages:
            sources.append("alerts")

    if user_id is not None:
        user_ctx = repo.fetch_user_context(user_id)
        if user_ctx:
            sources.append(f"user profile: {user_ctx.name}")

    if intent in ("PROFILE_ADVICE", "BUDGET_STRATEGY") and not trend_ctx:
        top_trends = repo.fetch_top_trends(limit=6)
        if top_trends:
            sources.append("top_trends (profit-ranked)")

    system_prompt = _build_system_prompt(intent, trend_ctx, user_ctx, top_trends, budget)

    if _USE_MOCK:
        answer = _mock_response(intent, trend_ctx, question)
    else:
        try:
            answer = _call_nvidia_chat(system_prompt, question)
            if not answer:
                answer = "The model returned an empty response. Try again or adjust NVIDIA_ENABLE_THINKING / model settings."
        except Exception as exc:
            answer = (
                f"AI service error: {exc}. "
                "Verify NVIDIA_API_KEY and https://integrate.api.nvidia.com reachability."
            )

    return {
        "answer": answer,
        "intent": intent,
        "trend": trend_ctx.trend_name if trend_ctx else trend_hint,
        "sources": sources,
        "mock": _USE_MOCK,
    }