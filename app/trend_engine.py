import json
from collections import Counter, defaultdict

from app.database import get_connection

MIN_TREND_FREQUENCY = 2


def normalize_keyword(keyword):
    return " ".join(str(keyword).strip().lower().split())


def parse_keywords(raw_keywords):
    if raw_keywords is None:
        return []

    if isinstance(raw_keywords, list):
        values = raw_keywords
    elif isinstance(raw_keywords, str):
        try:
            values = json.loads(raw_keywords)
        except json.JSONDecodeError:
            return []
    else:
        return []

    cleaned = []
    for item in values:
        normalized = normalize_keyword(item)
        if normalized:
            cleaned.append(normalized)
    return cleaned


def build_trends(min_frequency=MIN_TREND_FREQUENCY):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, extracted_keywords FROM processed_data")
    rows = cursor.fetchall()

    keyword_counts = Counter()
    keyword_to_processed = defaultdict(set)

    # 1) Parse + 2) Flatten into a frequency map
    for processed_id, extracted_keywords in rows:
        keywords = parse_keywords(extracted_keywords)
        for keyword in keywords:
            keyword_counts[keyword] += 1
            keyword_to_processed[keyword].add(processed_id)

    # Rebuild trend outputs each run so trend tables reflect current processed_data
    cursor.execute("DELETE FROM trend_mentions")
    cursor.execute("DELETE FROM trend_metrics")
    cursor.execute("DELETE FROM trends")

    # 3) Define trend by keyword frequency threshold
    trend_keywords = [kw for kw, count in keyword_counts.items() if count >= min_frequency]
    trend_keywords.sort(key=lambda kw: (-keyword_counts[kw], kw))

    for keyword in trend_keywords:
        strength = float(keyword_counts[keyword])
        mention_ids = sorted(keyword_to_processed[keyword])

        # 5) Insert trend
        cursor.execute(
            """
            INSERT INTO trends (name, strength, category, description, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            """,
            (
                keyword,
                strength,
                "keyword",
                f"Auto trend from {int(strength)} keyword mentions",
            ),
        )
        trend_id = cursor.lastrowid

        # 6) Insert trend mentions mapping
        for processed_id in mention_ids:
            cursor.execute(
                """
                INSERT INTO trend_mentions (trend_id, processed_id, mention_count, timestamp)
                VALUES (?, ?, 1, datetime('now'))
                """,
                (trend_id, processed_id),
            )

    conn.commit()
    conn.close()

    print(f"TREND ENGINE COMPLETE: {len(trend_keywords)} trends built")
