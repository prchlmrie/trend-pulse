"""Shared NVIDIA Integrate API (OpenAI-compatible) configuration."""

from __future__ import annotations

import os
from typing import Any, Optional

from dotenv import load_dotenv

load_dotenv()

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"


def get_nvidia_api_key() -> str:
    return (os.environ.get("NVIDIA_API_KEY") or "").strip()


def nvidia_mock_mode() -> bool:
    if get_nvidia_api_key():
        return False
    return True


def get_default_model() -> str:
    m = (os.environ.get("NVIDIA_MODEL") or DEFAULT_NVIDIA_MODEL).strip()
    return m or DEFAULT_NVIDIA_MODEL


def get_keywords_model() -> str:
    m = (os.environ.get("NVIDIA_KEYWORDS_MODEL") or "").strip()
    return m or get_default_model()


def analyst_max_tokens() -> int:
    raw = os.environ.get("NVIDIA_ANALYST_MAX_TOKENS", "65536").strip()
    try:
        n = int(raw)
        return max(256, min(n, 65536))
    except ValueError:
        return 65536


def analyst_extra_body() -> Optional[dict[str, Any]]:
    """Nemotron-style thinking; enabled by default (NVIDIA Integrate samples)."""
    raw = os.environ.get("NVIDIA_ENABLE_THINKING", "1").strip().lower()
    if raw in ("0", "false", "no", "off"):
        return None
    return {
        "chat_template_kwargs": {"enable_thinking": True},
        "reasoning_budget": 16384,
    }


def nvidia_stream_chat_text(client, **create_kwargs: Any) -> str:
    """
    Streamed chat completion: concatenate reasoning_content then content
    (same pattern as NVIDIA Integrate API samples).
    """
    reasoning_parts: list[str] = []
    content_parts: list[str] = []
    kwargs = {**create_kwargs, "stream": True}
    stream = client.chat.completions.create(**kwargs)
    for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        reasoning = getattr(delta, "reasoning_content", None)
        if reasoning:
            reasoning_parts.append(reasoning)
        if delta.content is not None:
            content_parts.append(delta.content)
    reasoning = "".join(reasoning_parts).strip()
    content = "".join(content_parts).strip()
    if reasoning and content:
        return f"{reasoning}\n\n---\n{content}"
    return content or reasoning


def build_nvidia_client():
    """Return OpenAI client for NVIDIA, or None if no SDK or no API key."""
    try:
        from openai import OpenAI
    except ImportError:
        return None
    key = get_nvidia_api_key()
    if not key:
        return None
    return OpenAI(api_key=key, base_url=NVIDIA_BASE_URL)
