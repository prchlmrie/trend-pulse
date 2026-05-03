"""LLM tool-calling loop for the AI Analyst (NVIDIA OpenAI-compatible API)."""

from __future__ import annotations

import json
from typing import Any, Optional

from app.ai_analyst_tools import ANALYST_TOOLS, execute_analyst_tool
from app.nvidia_llm import analyst_max_tokens, get_default_model
from app.repositories.analyst_repository import AnalystRepository


def _assistant_message_dict(msg: Any) -> dict[str, Any]:
    out: dict[str, Any] = {"role": "assistant", "content": msg.content or ""}
    if getattr(msg, "tool_calls", None):
        out["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments or "{}"},
            }
            for tc in msg.tool_calls
        ]
    return out


def run_analyst_agent(
    client: Any,
    question: str,
    user_id: Optional[int],
    repository: AnalystRepository,
) -> dict:
    """
    Multi-turn tool loop. Returns same shape as ask_analyst: answer, intent, trend, sources, mock.
    """
    uid_note = (
        f"The authenticated user_id for this session is {user_id}. "
        f"Pass it to get_user_profile when the user asks about their profile or budget fit."
        if user_id is not None
        else "No user_id is available; do not call get_user_profile unless the user supplies an id."
    )

    system = f"""You are TrendPulse AI, a market intelligence analyst for fashion e-commerce.

{uid_note}

Always use tools to read live database state before claiming metrics. Do not invent numbers.
- Use search_trends_semantic when the user describes a trend loosely or with words that may not match exact DB titles.
- Then call get_trend_metrics with the chosen trend_id.
- Use list_top_actionable_trends for open-ended “what should I sell” questions without a named trend.
- Use simulate_budget_allocation for spend / allocation questions with a dollar budget.
After tools, answer in concise markdown-friendly prose and cite concrete scores from payloads."""

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system},
        {"role": "user", "content": question},
    ]
    sources: list[str] = []
    trend_guess = ""

    max_rounds = 8
    for _ in range(max_rounds):
        resp = client.chat.completions.create(
            model=get_default_model(),
            messages=messages,
            tools=ANALYST_TOOLS,
            tool_choice="auto",
            temperature=0.45,
            top_p=0.92,
            max_tokens=min(analyst_max_tokens(), 8192),
            stream=False,
        )
        msg = resp.choices[0].message
        messages.append(_assistant_message_dict(msg))

        if not getattr(msg, "tool_calls", None) or len(msg.tool_calls) == 0:
            answer = (msg.content or "").strip() or "No answer was generated."
            return {
                "answer": answer,
                "intent": "LLM_TOOLS",
                "trend": trend_guess,
                "sources": list(dict.fromkeys(sources)),
                "mock": False,
            }

        for tc in msg.tool_calls:
            name = tc.function.name
            sources.append(f"tool:{name}")
            if name == "search_trends_semantic":
                sources.append("vector_index:chromadb")
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            payload = execute_analyst_tool(name, args, repository)
            if name == "get_trend_metrics":
                try:
                    data = json.loads(payload)
                    if data.get("trend_name"):
                        trend_guess = str(data["trend_name"])
                except (json.JSONDecodeError, TypeError, KeyError):
                    pass
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": payload,
                }
            )

    return {
        "answer": "The analyst stopped after the maximum number of tool rounds. Try a narrower question.",
        "intent": "LLM_TOOLS",
        "trend": trend_guess,
        "sources": list(dict.fromkeys(sources)),
        "mock": False,
    }
