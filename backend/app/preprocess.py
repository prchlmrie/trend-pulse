import json
import re
from datetime import datetime

from app.ai import extract_keywords
from app.database import get_connection
from app.nlp_signals import analyze_market_signal


def clean_text(text):
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_context_tags(cleaned_text):
    tags = []
    text = cleaned_text.lower()

    if any(token in text for token in ("streetwear", "outfit", "aesthetic")):
        tags.append("style_signal")
    if any(token in text for token in ("korean", "gen z", "trending", "inspo")):
        tags.append("youth_interest")
    if any(token in text for token in ("hoodie", "tshirt", "shirt", "bag", "tote")):
        tags.append("fashion_product")

    month = datetime.utcnow().month
    if month in (3, 4, 5):
        tags.append("spring_window")
    elif month in (6, 7, 8):
        tags.append("summer_window")
    elif month in (9, 10, 11):
        tags.append("autumn_window")
    else:
        tags.append("winter_window")

    return tags


def process_raw_data():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT r.id, r.content
        FROM raw_data r
        LEFT JOIN processed_data p
        ON r.id = p.raw_id
        WHERE p.raw_id IS NULL
        """
    )
    rows = cursor.fetchall()

    for raw_id, content in rows:
        cleaned = clean_text(content)
        keywords = extract_keywords(cleaned)
        context_tags = extract_context_tags(cleaned)
        nlp = analyze_market_signal(cleaned)

        cursor.execute(
            """
            INSERT INTO processed_data
            (raw_id, cleaned_text, extracted_keywords, context_tags, sentiment, signal_intent, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                raw_id,
                cleaned,
                json.dumps(keywords),
                json.dumps(context_tags),
                nlp["sentiment"],
                nlp["signal_intent"],
                datetime.now().isoformat(),
            ),
        )

        print(f"Processed: {cleaned}")
        print(f"Keywords: {keywords}")
        print(f"Context: {context_tags}")
        print("------")

    conn.commit()

    # Backfill context tags for any older processed rows.
    cursor.execute(
        """
        SELECT id, cleaned_text
        FROM processed_data
        WHERE context_tags IS NULL OR context_tags = ''
        """
    )
    missing_context_rows = cursor.fetchall()
    for processed_id, cleaned_text in missing_context_rows:
        context_tags = extract_context_tags(cleaned_text or "")
        cursor.execute(
            "UPDATE processed_data SET context_tags = ? WHERE id = ?",
            (json.dumps(context_tags), processed_id),
        )

    cursor.execute(
        """
        SELECT id, cleaned_text FROM processed_data
        WHERE sentiment IS NULL OR sentiment = '' OR signal_intent IS NULL OR signal_intent = ''
        """
    )
    for processed_id, cleaned_text in cursor.fetchall():
        nlp = analyze_market_signal(cleaned_text or "")
        cursor.execute(
            "UPDATE processed_data SET sentiment = ?, signal_intent = ? WHERE id = ?",
            (nlp["sentiment"], nlp["signal_intent"], processed_id),
        )

    conn.commit()
    conn.close()
