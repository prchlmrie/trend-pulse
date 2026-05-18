import app.ai
# Mock the AI keyword extractor so it doesn't need an API key
def mock_extract_keywords(text):
    text_lower = text.lower()
    if "hoodie" in text_lower:
        return ["hoodie", "streetwear", "oversized"]
    if "tumbler" in text_lower or "stanley" in text_lower or "insulated" in text_lower:
        return ["tumbler", "drinkware", "kitchen"]
    if "crocs" in text_lower or "clog" in text_lower:
        return ["clog", "footwear", "sandals"]
    if "sunscreen" in text_lower or "skincare" in text_lower or "serum" in text_lower or "niacinamide" in text_lower:
        return ["skincare", "beauty", "sunscreen"]
    if "air fryer" in text_lower:
        return ["air fryer", "kitchen", "appliance"]
    if "lamp" in text_lower or "organizer" in text_lower or "desk" in text_lower:
        return ["desk", "home", "organizer"]
    if "tote" in text_lower or "bag" in text_lower or "sling" in text_lower:
        return ["tote bag", "shoulder bag", "accessories"]
    if "tshirt" in text_lower or "tee" in text_lower or "shirt" in text_lower:
        return ["tshirt", "oversized", "streetwear"]
    if "raket" in text_lower or "reseller" in text_lower:
        return ["reseller", "side hustle", "commerce"]
    return ["fashion", "clothing", "philippines"]

app.ai.extract_keywords = mock_extract_keywords

from app.sample_data import insert_sample_data
from app.pipeline import run_pipeline
from app.auth_jwt import hash_password
from app.database import get_connection, create_tables

def seed():
    print("Creating tables...")
    create_tables()
    
    # Insert a mock user first so user_personalization can run for them
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users LIMIT 1")
    if not cursor.fetchone():
        print("Inserting mock user...")
        cursor.execute(
            """
            INSERT INTO users (username, password_hash, name, budget, risk_tolerance, preferred_categories, experience_level, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                "demo",
                hash_password("demo123"),
                "Mara Reyes",
                18000,
                "MEDIUM",
                "fashion,beauty,home",
                "INTERMEDIATE",
            ),
        )
        conn.commit()
    conn.close()

    print("Inserting sample raw data...")
    insert_sample_data()
    print("Running pipeline to generate trends and insights...")
    run_pipeline()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
