import json
import re

from app.nvidia_llm import build_nvidia_client, get_keywords_model, get_nvidia_api_key


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
    if not get_nvidia_api_key():
        print("NVIDIA_API_KEY is missing.")
        return []

    client = build_nvidia_client()
    if client is None:
        print("OpenAI SDK unavailable or NVIDIA client could not be built.")
        return []

    prompt = f"""
Return ONLY a JSON list of product keywords.
No explanation and no markdown formatting.

Text: {text}

Example:
["oversized hoodie", "streetwear"]
"""

    try:
        response = client.chat.completions.create(
            model=get_keywords_model(),
            messages=[
                {
                    "role": "system",
                    "content": "You reply with a single JSON array of strings only. No markdown.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            top_p=0.95,
            max_tokens=768,
            stream=False,
        )
    except Exception as exc:
        print(f"NVIDIA keyword request failed: {exc}")
        return []

    msg = response.choices[0].message
    content = msg.content
    if content is None:
        print(f"Unable to read model content from NVIDIA response.")
        return []

    keywords = _parse_keywords(content)
    if not keywords:
        print(f"Unable to parse keywords JSON from model output: {content}")
    return keywords
