import sqlite3

DB_NAME = "trendpulse.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    return conn

def create_tables():
    conn = get_connection()
    cursor = conn.cursor()

    # RAW DATA
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS raw_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        content TEXT,
        engagement INTEGER,
        created_at TEXT,
        collected_at TEXT,
        ingestion_channel TEXT
    )
    """)

    # PROCESSED DATA
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS processed_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_id INTEGER,
        cleaned_text TEXT,
        extracted_keywords TEXT,
        context_tags TEXT,
        category TEXT,
        processed_at TEXT,
        FOREIGN KEY (raw_id) REFERENCES raw_data(id)
    )
    """)

    # TRENDS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        strength REAL,
        category TEXT,
        description TEXT,
        image_url TEXT,
        created_at TEXT
    )
    """)

    # TREND MENTIONS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trend_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id INTEGER,
        processed_id INTEGER,
        mention_count INTEGER,
        timestamp TEXT,
        FOREIGN KEY (trend_id) REFERENCES trends(id),
        FOREIGN KEY (processed_id) REFERENCES processed_data(id)
    )
    """)

    # TREND METRICS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trend_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id INTEGER,
        frequency REAL,
        growth_rate REAL,
        competition_level REAL,
        total_engagement REAL,
        avg_engagement REAL,
        velocity REAL,
        predicted_growth_14d REAL,
        trend_score REAL,
        lifecycle_stage TEXT,
        calculated_at TEXT,
        FOREIGN KEY (trend_id) REFERENCES trends(id)
    )
    """)

    # PRODUCT INSIGHTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS product_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id INTEGER,
        product_category TEXT,
        price_min REAL,
        price_max REAL,
        demand_score REAL,
        competition_score REAL,
        profit_score REAL,
        created_at TEXT,
        FOREIGN KEY (trend_id) REFERENCES trends(id)
    )
    """)

    # RECOMMENDATIONS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id INTEGER,
        profit_score REAL,
        suggested_action TEXT,
        suggested_inventory TEXT,
        entry_timing TEXT,
        risk_level TEXT,
        reasoning TEXT,
        created_at TEXT,
        FOREIGN KEY (trend_id) REFERENCES trends(id)
    )
    """)

    # ACTIONABLE ALERTS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id INTEGER,
        alert_level TEXT,
        message TEXT,
        created_at TEXT,
        FOREIGN KEY (trend_id) REFERENCES trends(id)
    )
    """)

    # USERS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        name TEXT,
        budget REAL,
        risk_tolerance TEXT,
        preferred_categories TEXT,
        experience_level TEXT,
        created_at TEXT
    )
    """)

    # USER RECOMMENDATIONS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        recommendation_id INTEGER,
        allocated_budget REAL,
        expected_return REAL,
        confidence REAL,
        status TEXT,
        created_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
    )
    """)

    # APPEND-ONLY trend intelligence (profit / scores over pipeline runs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trend_intelligence_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trend_id INTEGER NOT NULL,
        trend_score REAL,
        profit_score REAL,
        lifecycle_stage TEXT,
        frequency REAL,
        recorded_at TEXT,
        FOREIGN KEY (trend_id) REFERENCES trends(id)
    )
    """)

    # Backfill schema for existing DBs created before 'strength' existed
    cursor.execute("PRAGMA table_info(trends)")
    trend_columns = [col[1] for col in cursor.fetchall()]
    if "strength" not in trend_columns:
        cursor.execute("ALTER TABLE trends ADD COLUMN strength REAL")
    if "image_url" not in trend_columns:
        cursor.execute("ALTER TABLE trends ADD COLUMN image_url TEXT")

    # Backfill schema for existing DBs created before analytics columns existed
    cursor.execute("PRAGMA table_info(trend_metrics)")
    metric_columns = [col[1] for col in cursor.fetchall()]
    if "total_engagement" not in metric_columns:
        cursor.execute("ALTER TABLE trend_metrics ADD COLUMN total_engagement REAL")
    if "avg_engagement" not in metric_columns:
        cursor.execute("ALTER TABLE trend_metrics ADD COLUMN avg_engagement REAL")
    if "velocity" not in metric_columns:
        cursor.execute("ALTER TABLE trend_metrics ADD COLUMN velocity REAL")
    if "predicted_growth_14d" not in metric_columns:
        cursor.execute("ALTER TABLE trend_metrics ADD COLUMN predicted_growth_14d REAL")

    # Backfill schema for existing DBs created before BI columns existed
    cursor.execute("PRAGMA table_info(product_insights)")
    insight_columns = [col[1] for col in cursor.fetchall()]
    if "product_category" not in insight_columns:
        cursor.execute("ALTER TABLE product_insights ADD COLUMN product_category TEXT")
    if "price_min" not in insight_columns:
        cursor.execute("ALTER TABLE product_insights ADD COLUMN price_min REAL")
    if "price_max" not in insight_columns:
        cursor.execute("ALTER TABLE product_insights ADD COLUMN price_max REAL")
    if "demand_score" not in insight_columns:
        cursor.execute("ALTER TABLE product_insights ADD COLUMN demand_score REAL")
    if "competition_score" not in insight_columns:
        cursor.execute("ALTER TABLE product_insights ADD COLUMN competition_score REAL")
    if "profit_score" not in insight_columns:
        cursor.execute("ALTER TABLE product_insights ADD COLUMN profit_score REAL")
    if "created_at" not in insight_columns:
        cursor.execute("ALTER TABLE product_insights ADD COLUMN created_at TEXT")

    cursor.execute("PRAGMA table_info(recommendations)")
    recommendation_columns = [col[1] for col in cursor.fetchall()]
    if "profit_score" not in recommendation_columns:
        cursor.execute("ALTER TABLE recommendations ADD COLUMN profit_score REAL")
    if "entry_timing" not in recommendation_columns:
        cursor.execute("ALTER TABLE recommendations ADD COLUMN entry_timing TEXT")

    cursor.execute("PRAGMA table_info(processed_data)")
    processed_columns = [col[1] for col in cursor.fetchall()]
    if "context_tags" not in processed_columns:
        cursor.execute("ALTER TABLE processed_data ADD COLUMN context_tags TEXT")
    if "sentiment" not in processed_columns:
        cursor.execute("ALTER TABLE processed_data ADD COLUMN sentiment TEXT")
    if "signal_intent" not in processed_columns:
        cursor.execute("ALTER TABLE processed_data ADD COLUMN signal_intent TEXT")

    cursor.execute("PRAGMA table_info(raw_data)")
    raw_columns = [col[1] for col in cursor.fetchall()]
    if "ingestion_channel" not in raw_columns:
        cursor.execute("ALTER TABLE raw_data ADD COLUMN ingestion_channel TEXT")

    cursor.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in cursor.fetchall()]
    if "username" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN username TEXT")
    if "password_hash" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    if "risk_tolerance" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN risk_tolerance TEXT")
    if "preferred_categories" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN preferred_categories TEXT")
    if "experience_level" not in user_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN experience_level TEXT")

    cursor.execute("PRAGMA table_info(user_recommendations)")
    user_rec_columns = [col[1] for col in cursor.fetchall()]
    if "expected_return" not in user_rec_columns:
        cursor.execute("ALTER TABLE user_recommendations ADD COLUMN expected_return REAL")
    if "confidence" not in user_rec_columns:
        cursor.execute("ALTER TABLE user_recommendations ADD COLUMN confidence REAL")
    if "status" not in user_rec_columns:
        cursor.execute("ALTER TABLE user_recommendations ADD COLUMN status TEXT")

    conn.commit()
    conn.close()
