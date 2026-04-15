"""
TrendPulse - Mock Data Generator
Uses Qwen API to generate realistic Taglish social media posts
spread across 7 days with simulated trend spikes.
"""

import json
import random
import requests
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

QWEN_API_KEY = os.getenv("QWEN_API_KEY")
QWEN_API_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

# -------------------------------------------------------
# TREND CATEGORIES
# Each product has a "spike_day" — the day mentions surge.
# This gives the trend engine real data to detect.
# -------------------------------------------------------
TREND_CONFIG = [
    # Fashion
    {"product": "oversized tee", "category": "fashion", "spike_day": 3, "base": 4, "peak": 20},
    {"product": "baggy jeans",   "category": "fashion", "spike_day": 5, "base": 3, "peak": 18},
    {"product": "crop top",      "category": "fashion", "spike_day": 2, "base": 5, "peak": 22},
    {"product": "bucket hat",    "category": "fashion", "spike_day": 4, "base": 2, "peak": 15},

    # Accessories
    {"product": "chunky ring",   "category": "accessories", "spike_day": 6, "base": 3, "peak": 16},
    {"product": "canvas tote bag","category": "accessories","spike_day": 3, "base": 4, "peak": 19},
    {"product": "pearl earrings","category": "accessories", "spike_day": 1, "base": 6, "peak": 21},

    # Gadgets
    {"product": "bluetooth speaker", "category": "gadgets", "spike_day": 5, "base": 3, "peak": 17},
    {"product": "phone stand",  "category": "gadgets",      "spike_day": 2, "base": 4, "peak": 14},

    # Skincare
    {"product": "sunscreen",    "category": "skincare",     "spike_day": 4, "base": 5, "peak": 25},
    {"product": "lip tint",     "category": "skincare",     "spike_day": 6, "base": 4, "peak": 20},
]

PLATFORMS = ["tiktok", "instagram", "shopee"]
START_DATE = datetime(2025, 4, 9)  # Day 1


def call_qwen(prompt: str) -> str:
    """Send a prompt to the Qwen API and return the response text."""
    headers = {
        "Authorization": f"Bearer {QWEN_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "qwen3.6-plus",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.9,
        "max_tokens": 1200
    }
    response = requests.post(QWEN_API_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def generate_posts_for_product(product: str, category: str, count: int, platform: str) -> list:
    """Ask Qwen to generate realistic Taglish posts for a given product."""
    prompt = f"""Generate exactly {count} different realistic Filipino social media captions 
about "{product}" in the {category} category.

Rules:
- Mix Tagalog and English (Taglish) naturally — how real Filipinos post online
- Include 2-4 relevant hashtags per caption (e.g. #ootdph, #shopee, #fyp)
- Include emojis naturally
- Keep each caption short (1-3 sentences)
- Make them sound genuine, not like ads
- Each caption must be on a separate line
- Do NOT number them, do NOT add labels or prefixes
- Output ONLY the captions, nothing else

Platform: {platform}
"""
    raw = call_qwen(prompt)
    lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]
    # Only return up to the count requested
    return lines[:count]


def get_mention_count(day: int, spike_day: int, base: int, peak: int) -> int:
    """
    Return how many posts to generate for a product on a given day.
    Creates a natural spike curve: slow build → spike → slight taper.
    """
    if day < spike_day:
        # Gradual increase
        progress = day / spike_day
        count = int(base + (peak - base) * progress * 0.5)
    elif day == spike_day:
        # Peak day
        count = peak
    else:
        # Taper off after spike but stay above baseline
        drop = (day - spike_day) * 2
        count = max(base, peak - drop)
    return count + random.randint(-1, 1)  # Small natural variance


def generate_all_posts() -> list:
    """Generate all mock posts across 7 days for all products."""
    all_posts = []
    post_id = 1

    for day in range(1, 8):
        post_date = (START_DATE + timedelta(days=day - 1)).strftime("%Y-%m-%d")
        print(f"\n📅 Day {day} — {post_date}")

        for trend in TREND_CONFIG:
            product  = trend["product"]
            category = trend["category"]
            spike_day = trend["spike_day"]
            base     = trend["base"]
            peak     = trend["peak"]
            platform = random.choice(PLATFORMS)

            count = get_mention_count(day, spike_day, base, peak)
            print(f"  → Generating {count} posts for '{product}' on {platform}...")

            try:
                captions = generate_posts_for_product(product, category, count, platform)
                for caption in captions:
                    all_posts.append({
                        "post_id": f"post_{post_id:04d}",
                        "platform": platform,
                        "product_hint": product,   # used for validation only, not fed to Qwen during analysis
                        "category": category,
                        "caption": caption,
                        "date": post_date,
                        "day": day
                    })
                    post_id += 1
            except Exception as e:
                print(f"  ⚠️  Error generating posts for '{product}': {e}")

    return all_posts


def save_to_json(posts: list, filepath: str):
    """Save posts to a JSON file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Saved {len(posts)} posts to {filepath}")


if __name__ == "__main__":
    print("🚀 TrendPulse Mock Data Generator")
    print("=" * 40)

    if not QWEN_API_KEY:
        print("❌ QWEN_API_KEY not found in .env file. Please set it first.")
        exit(1)

    posts = generate_all_posts()
    output_path = os.path.join(os.path.dirname(__file__), "../data/mock_posts.json")
    save_to_json(posts, output_path)

    print(f"\n📊 Summary:")
    print(f"   Total posts generated : {len(posts)}")
    print(f"   Days covered          : 7")
    print(f"   Products tracked      : {len(TREND_CONFIG)}")
    print(f"   Output file           : data/mock_posts.json")
    print(f"\n✅ Ready to seed into MongoDB!")
