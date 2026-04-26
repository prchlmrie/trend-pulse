import app.ai
# Mock the AI keyword extractor so it doesn't need an API key
def mock_extract_keywords(text):
    text_lower = text.lower()
    if "hoodie" in text_lower:
        return ["hoodie", "streetwear", "oversized"]
    if "tote" in text_lower or "bag" in text_lower:
        return ["tote bag", "shoulder bag", "accessories"]
    if "tshirt" in text_lower or "tee" in text_lower:
        return ["tshirt", "oversized", "streetwear"]
    return ["fashion", "clothing"]

app.ai.extract_keywords = mock_extract_keywords

from app.sample_data import insert_sample_data
from app.pipeline import run_pipeline
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
            INSERT INTO users (name, budget, risk_tolerance, preferred_categories, experience_level)
            VALUES (?, ?, ?, ?, ?)
            """,
            ("Alex Designer", 3000, "HIGH", "streetwear,accessories", "EXPERT")
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
