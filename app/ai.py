import json
import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("QWEN_API_KEY")
API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation"


def _parse_keywords(content):
    if isinstance(content, list):
        return [str(item).strip() for item in content if str(item).strip()]

    if not isinstance(content, str):
        return []

    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)

    try:
        data = json.loads(text)
        if isinstance(data, list):
            return [str(item).strip() for item in data if str(item).strip()]
    except json.JSONDecodeError:
        pass

    return []


def extract_keywords(text):
    if not API_KEY:
        print("QWEN_API_KEY is missing.")
        return []

    prompt = f"""
Return ONLY a JSON list of product keywords.
No explanation and no markdown formatting.

Text: {text}

Example:
["oversized hoodie", "streetwear"]
"""

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "qwen-turbo",
        "input": {
            "messages": [{"role": "user", "content": prompt}],
        },
    }

    try:
        session = requests.Session()
        session.trust_env = False
        response = session.post(API_URL, headers=headers, json=payload, timeout=30)
    except requests.RequestException as exc:
        print(f"Qwen request failed: {exc}")
        return []

    if response.status_code != 200:
        print(f"Qwen API error {response.status_code}: {response.text}")
        return []

    try:
        body = response.json()
    except json.JSONDecodeError as exc:
        print(f"Unable to parse Qwen response JSON: {exc}")
        return []

    output = body.get("output", {})
    content = output.get("text")
    if content is None:
        choices = output.get("choices", [])
        if choices:
            content = choices[0].get("message", {}).get("content")

    if content is None:
        print(f"Unable to parse Qwen response envelope: {body}")
        return []

    keywords = _parse_keywords(content)
    if not keywords:
        print(f"Unable to parse keywords JSON from model output: {content}")
    return keywords
