"""OpenAI-style tool schemas + execution for the AI Analyst agent."""

from __future__ import annotations

import json
from dataclasses import asdict
from typing import Any, Optional

from app.analyst_context import TrendContext, UserContext
from app.repositories.analyst_repository import AnalystRepository
from app.trend_vector_index import query_trends_semantic
from app.what_if_simulator import recommend_for_budget


def trend_context_to_dict(ctx: TrendContext | None) -> dict[str, Any]:
    if ctx is None:
        return {}
    d = asdict(ctx)
    d.pop("alert_messages", None)
    d["alerts"] = ctx.alert_messages
    return d


def user_context_to_dict(ctx: UserContext | None) -> dict[str, Any]:
    if ctx is None:
        return {}
    return asdict(ctx)


ANALYST_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_trends_semantic",
            "description": (
                "Find trends by meaning (not exact name). Use when the user describes a product, "
                "sustainability angle, or style (e.g. 'sustainable shirts') that may not match DB titles."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language search query"},
                    "n_results": {
                        "type": "integer",
                        "description": "Max hits to return (1-10)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_trend_metrics",
            "description": "Load full live metrics, scores, and alerts for one trend by numeric trend_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "trend_id": {"type": "integer", "description": "Trend primary key from search_trends_semantic or DB"},
                },
                "required": ["trend_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_profile",
            "description": "Load the retail user profile (budget, risk, experience) for personalization.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer", "description": "User id from session context"},
                },
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_top_actionable_trends",
            "description": "List top SELL/TEST trends ranked by profit for strategy questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "default": 6, "description": "How many rows to return"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "simulate_budget_allocation",
            "description": "Simulate how a cash budget could be spread across high-profit actionable trends.",
            "parameters": {
                "type": "object",
                "properties": {
                    "budget": {"type": "number", "description": "Dollar budget (>0)"},
                    "top_n": {"type": "integer", "default": 3, "description": "Number of product lines to fill"},
                },
                "required": ["budget"],
            },
        },
    },
]


def execute_analyst_tool(
    name: str,
    arguments: dict[str, Any],
    repository: AnalystRepository,
) -> str:
    try:
        if name == "search_trends_semantic":
            q = str(arguments.get("query") or "").strip()
            n = int(arguments.get("n_results") or 5)
            hits = query_trends_semantic(q, n_results=max(1, min(n, 10)))
            return json.dumps({"matches": hits})

        if name == "get_trend_metrics":
            tid = int(arguments["trend_id"])
            ctx = repository.fetch_trend_context_by_id(tid)
            if not ctx:
                return json.dumps({"error": "trend_not_found", "trend_id": tid})
            return json.dumps(trend_context_to_dict(ctx))

        if name == "get_user_profile":
            uid = int(arguments["user_id"])
            uctx = repository.fetch_user_context(uid)
            if not uctx:
                return json.dumps({"error": "user_not_found", "user_id": uid})
            return json.dumps(user_context_to_dict(uctx))

        if name == "list_top_actionable_trends":
            lim = int(arguments.get("limit") or 6)
            rows = repository.fetch_top_trends(limit=max(1, min(lim, 20)))
            return json.dumps({"trends": rows})

        if name == "simulate_budget_allocation":
            budget = float(arguments["budget"])
            top_n = int(arguments.get("top_n") or 3)
            if budget <= 0:
                return json.dumps({"error": "budget_must_be_positive"})
            picks, remaining = recommend_for_budget(budget, top_n=max(1, min(top_n, 10)))
            return json.dumps({"picks": picks, "remaining_budget": remaining})

        return json.dumps({"error": "unknown_tool", "name": name})
    except Exception as exc:
        return json.dumps({"error": str(exc), "tool": name})
