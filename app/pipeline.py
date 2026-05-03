#pipeline.py

from app.database import create_tables
from app.intelligence_history import record_trend_intelligence_snapshots
from app.sample_data import insert_sample_data
from app.preprocess import process_raw_data
from app.trend_engine import build_trends
from app.trend_vector_index import sync_trend_embeddings_from_db
from app.trend_analytics import compute_trend_metrics
from app.business_intelligence import build_product_insights
from app.recommendation_engine import build_recommendations
from app.alerts_engine import build_alerts
from app.user_personalization import build_user_recommendations


def _run_core_trend_pipeline():
    process_raw_data()
    build_trends()
    sync_trend_embeddings_from_db()
    compute_trend_metrics()
    build_product_insights()
    record_trend_intelligence_snapshots()
    build_recommendations()
    build_user_recommendations()
    build_alerts()


def run_pipeline():
    print("PIPELINE STARTING...")

    create_tables()
    insert_sample_data()
    _run_core_trend_pipeline()

    print("PIPELINE DONE")


def run_incremental_pipeline():
    """
    Batch refresh without re-seeding sample CSV-style data.
    Use after real-time ingest (webhook) to recompute trends and intelligence.
    """
    print("INCREMENTAL PIPELINE STARTING...")
    create_tables()
    _run_core_trend_pipeline()
    print("INCREMENTAL PIPELINE DONE")
