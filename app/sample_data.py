from datetime import datetime

from app.database import get_connection


def insert_sample_data():
    conn = get_connection()
    cursor = conn.cursor()

    sample_data = [
        ("tiktok", "Oversized hoodie outfit inspo #streetwear", 1200),
        ("shopee", "Korean oversized t-shirt for men and women", 500),
        ("tiktok", "Mini shoulder bags are trending right now!", 900),
        ("shopee", "Canvas tote bag aesthetic design", 300),
        ("tiktok", "Streetwear oversized hoodie styling ideas for campus", 1400),
        ("shopee", "Vintage washed oversized hoodie unisex", 650),
        ("tiktok", "Best tote bag styles for daily commute", 780),
        ("shopee", "Minimalist tote bag with zipper pocket", 430),
        ("tiktok", "Gen Z layering with baggy t-shirt trend", 980),
        ("shopee", "Drop shoulder oversized t-shirt premium cotton", 720),
        ("tiktok", "Shoulder bag outfit combinations going viral", 1100),
        ("shopee", "Korean mini shoulder bag leather look", 560),
        ("tiktok", "Aesthetic canvas bag ideas for school", 840),
        ("shopee", "Large canvas tote with inner organizer", 390),
        ("tiktok", "Neutral hoodie colorways for street fashion", 1020),
        ("shopee", "Fleece hoodie oversize fit for women", 610),
        ("tiktok", "How to style oversized tee with cargos", 930),
        ("shopee", "Loose fit oversized t-shirt black and white", 540),
        ("tiktok", "Top sling bag picks for daily errands", 760),
        ("shopee", "Compact shoulder sling bag for essentials", 470),
        ("tiktok", "Trending crossbody bag lookbook 2026", 890),
        ("shopee", "Crossbody mini bag with adjustable strap", 510),
        ("tiktok", "Streetwear starter pack hoodie tee and tote", 1280),
        ("shopee", "Street style hoodie and t-shirt bundle set", 580),
        ("tiktok", "Small business best selling tote bag styles", 970),
        ("shopee", "Eco canvas tote bag for resellers wholesale", 440),
        ("tiktok", "Oversized hoodie haul under budget", 1150),
        ("shopee", "Budget oversized hoodie heavy cotton", 520),
    ]

    inserted = 0
    for source, content, engagement in sample_data:
        cursor.execute(
            """
            SELECT 1
            FROM raw_data
            WHERE source = ? AND content = ? AND engagement = ?
            LIMIT 1
            """,
            (source, content, engagement),
        )
        exists = cursor.fetchone()
        if exists:
            continue

        cursor.execute(
            """
            INSERT INTO raw_data (source, content, engagement, created_at, collected_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                source,
                content,
                engagement,
                datetime.now().isoformat(),
                datetime.now().isoformat(),
            ),
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"SAMPLE DATA COMPLETE: {inserted} new rows")
