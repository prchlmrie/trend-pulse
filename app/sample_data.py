from datetime import datetime

from app.database import get_connection


def insert_sample_data():
    """
    Seed raw social/commerce signals tuned for Philippines resellers
    (Shopee/Lazada/TikTok-style language, peso-adjacent engagement, local context).
    """
    conn = get_connection()
    cursor = conn.cursor()

    sample_data = [
        ("tiktok", "POV: OOTD sa LRT Line 1 — oversized tee + tote na budol sa Shopee ₱199 lang", 1840),
        ("shopee", "Oversized cotton tee unisex free ship Metro Manila COD 11.11 sale", 920),
        ("facebook", "Moms group: san nakakabili ng school shoes mura pero matibay QC area", 640),
        ("lazada", "Air fryer 4.5L digital timer free shipping NCR installment available", 1120),
        ("tiktok", "Stanley tumbler dupe budol finds sa TikTok Shop — same aesthetic half the price daw", 9600),
        ("shopee", "Insulated tumbler 1L straw lid BPA free Shopee Mall seller", 1580),
        ("tiktok", "Crocs-style clog OOTD for rainy season commute sa Pinas #commuterlife", 4230),
        ("lazada", "Unisex garden clog lightweight EVA anti slip Lazada bonus vouchers", 890),
        ("tiktok", "Skincare routine for morena skin under ₱500 — local brands only", 7120),
        ("shopee", "SPF50 PA++++ sunscreen gel no white cast Philippine humidity tested", 1340),
        ("facebook", "Reseller raket: san magandang supplier ng tote bags bulk for province shipping", 510),
        ("tiktok", "Gen Z condo essentials BGC — minimalist desk lamp and mesh organizer", 2100),
        ("shopee", "LED desk lamp USB touch dimmer student dorm condo friendly", 760),
        ("tiktok", "Back-to-school haul 2026: black shoes + white socks set na pasok sa uniform", 2890),
        ("lazada", "Black leather school shoes boys girls Lazada cashback NCR", 1430),
        ("tiktok", "Sulit finds sa Divisoria pero online: canvas tote with inner pocket", 1750),
        ("shopee", "Canvas tote bag plain for printing sublimation reseller friendly", 420),
        ("tiktok", "Jeepney-proof sling bag — crossbody anti theft zipper daw sabi ng comments", 3340),
        ("shopee", "Anti theft sling bag USB port nylon waterproof", 990),
        ("tiktok", "K-drama inspired cardigan for Tagaytay weekend — layer tips", 1980),
        ("lazada", "Knit cardigan Korean style one size Lazada free returns", 870),
        ("facebook", "OFW padala care package ideas: portable fan + tumbler + snacks box", 920),
        ("shopee", "Mini portable neck fan rechargeable Type-C gift set", 1180),
        ("tiktok", "TikTok budol: magnetic phone mount for Grab/trike drivers legit ba?", 5600),
        ("shopee", "Car phone holder magnetic vent clip motorcycle compatible", 340),
        ("tiktok", "Province reseller: COD pa rin winner sa probinsya vs card only", 2400),
        ("facebook", "Shopee 11.11 prep — paano i-price ang hoodie para may tubo pa rin", 880),
        ("shopee", "Fleece hoodie oversize local brand Metro Manila same day delivery", 1540),
        ("tiktok", "Aesthetic study table setup for UP / La Salle students under ₱3k", 4520),
        ("lazada", "Mesh desk organizer stackable study table accessories bundle", 610),
        ("tiktok", "LazBeauty vs Shopee beauty — sino mas mura sa serum niacinamide", 8900),
        ("shopee", "Niacinamide 10% serum 30ml Korean formula local distributor", 520),
        ("facebook", "Barangay page: piso sale tote bags tomorrow 7am near palengke", 1200),
        ("tiktok", "UV Express essentials: small bag + powerbank + payong na kasya sa lap", 2670),
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
            INSERT INTO raw_data (source, content, engagement, created_at, collected_at, ingestion_channel)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                source,
                content,
                engagement,
                datetime.now().isoformat(),
                datetime.now().isoformat(),
                "batch_seed",
            ),
        )
        inserted += 1

    conn.commit()
    conn.close()
    print(f"SAMPLE DATA COMPLETE: {inserted} new rows")
