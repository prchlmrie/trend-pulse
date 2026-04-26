from app.database import create_tables
from app.sample_data import insert_sample_data
from app.preprocess import process_raw_data
from app.trend_engine import build_trends
from app.trend_analytics import compute_trend_metrics
from app.business_intelligence import build_product_insights
from app.recommendation_engine import build_recommendations
from app.alerts_engine import build_alerts
from app.user_personalization import build_user_recommendations

def run_pipeline():
    print("PIPELINE STARTING...")

    create_tables()
    insert_sample_data()
    process_raw_data()

    build_trends()
    compute_trend_metrics()
    build_product_insights()
    build_recommendations()
    build_user_recommendations()
    build_alerts()

    print("PIPELINE DONE")
