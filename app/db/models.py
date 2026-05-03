from sqlalchemy import Column, Float, ForeignKey, Integer, Text

from app.db.base import Base


class RawData(Base):
    __tablename__ = "raw_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(Text)
    content = Column(Text)
    engagement = Column(Integer)
    created_at = Column(Text)
    collected_at = Column(Text)


class ProcessedData(Base):
    __tablename__ = "processed_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    raw_id = Column(Integer, ForeignKey("raw_data.id"))
    cleaned_text = Column(Text)
    extracted_keywords = Column(Text)
    context_tags = Column(Text)
    category = Column(Text)
    processed_at = Column(Text)


class Trend(Base):
    __tablename__ = "trends"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text)
    strength = Column(Float)
    category = Column(Text)
    description = Column(Text)
    image_url = Column(Text)
    created_at = Column(Text)


class TrendMention(Base):
    __tablename__ = "trend_mentions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trend_id = Column(Integer, ForeignKey("trends.id"))
    processed_id = Column(Integer, ForeignKey("processed_data.id"))
    mention_count = Column(Integer)
    timestamp = Column(Text)


class TrendMetric(Base):
    __tablename__ = "trend_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trend_id = Column(Integer, ForeignKey("trends.id"))
    frequency = Column(Float)
    growth_rate = Column(Float)
    competition_level = Column(Float)
    total_engagement = Column(Float)
    avg_engagement = Column(Float)
    velocity = Column(Float)
    predicted_growth_14d = Column(Float)
    trend_score = Column(Float)
    lifecycle_stage = Column(Text)
    calculated_at = Column(Text)


class ProductInsight(Base):
    __tablename__ = "product_insights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trend_id = Column(Integer, ForeignKey("trends.id"))
    product_category = Column(Text)
    price_min = Column(Float)
    price_max = Column(Float)
    demand_score = Column(Float)
    competition_score = Column(Float)
    profit_score = Column(Float)
    created_at = Column(Text)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trend_id = Column(Integer, ForeignKey("trends.id"))
    profit_score = Column(Float)
    suggested_action = Column(Text)
    suggested_inventory = Column(Text)
    entry_timing = Column(Text)
    risk_level = Column(Text)
    reasoning = Column(Text)
    created_at = Column(Text)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trend_id = Column(Integer, ForeignKey("trends.id"))
    alert_level = Column(Text)
    message = Column(Text)
    created_at = Column(Text)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(Text, unique=True)
    password_hash = Column(Text)
    name = Column(Text)
    budget = Column(Float)
    risk_tolerance = Column(Text)
    preferred_categories = Column(Text)
    experience_level = Column(Text)
    created_at = Column(Text)


class UserRecommendation(Base):
    __tablename__ = "user_recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"))
    allocated_budget = Column(Float)
    expected_return = Column(Float)
    confidence = Column(Float)
    status = Column(Text)
    created_at = Column(Text)


class TrendIntelligenceSnapshot(Base):
    __tablename__ = "trend_intelligence_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trend_id = Column(Integer, ForeignKey("trends.id"), nullable=False)
    trend_score = Column(Float)
    profit_score = Column(Float)
    lifecycle_stage = Column(Text)
    frequency = Column(Float)
    recorded_at = Column(Text)
