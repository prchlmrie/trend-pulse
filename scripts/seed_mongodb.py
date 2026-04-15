"""
TrendPulse - MongoDB Seeder
Reads the generated mock_posts.json and seeds it into MongoDB.
"""

import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = "trendpulse"
COLLECTION = "posts"


def seed():
    # Load mock data
    data_path = os.path.join(os.path.dirname(__file__), "../data/mock_posts.json")
    if not os.path.exists(data_path):
        print("❌ mock_posts.json not found. Run generate_mock_data.py first.")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        posts = json.load(f)

    # Connect to MongoDB
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION]

    # Clear existing data to avoid duplicates on re-seed
    deleted = collection.delete_many({})
    print(f"🗑️  Cleared {deleted.deleted_count} existing posts")

    # Insert all posts
    result = collection.insert_many(posts)
    print(f"✅ Seeded {len(result.inserted_ids)} posts into '{DB_NAME}.{COLLECTION}'")

    # Quick verify
    total = collection.count_documents({})
    print(f"📦 Total documents in collection: {total}")

    # Show sample
    print("\n🔍 Sample post:")
    sample = collection.find_one({}, {"_id": 0})
    print(json.dumps(sample, indent=2, ensure_ascii=False))

    client.close()


if __name__ == "__main__":
    seed()
