from typing import Any

from pydantic import BaseModel, Field, field_validator


class RootResponse(BaseModel):
    message: str


class PipelineRunResponse(BaseModel):
    ok: bool
    message: str
    trend_count: int | None = None
    alert_count: int | None = None
    trends_delta: int | None = None
    alerts_delta: int | None = None


class DataTablesResponse(BaseModel):
    raw_data: list[dict[str, Any]]
    processed_data: list[dict[str, Any]]
    trends: list[dict[str, Any]]


class AllTablesResponse(BaseModel):
    raw_data: list[dict[str, Any]]
    processed_data: list[dict[str, Any]]
    trends: list[dict[str, Any]]
    trend_mentions: list[dict[str, Any]]
    trend_metrics: list[dict[str, Any]]
    product_insights: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]
    alerts: list[dict[str, Any]]
    users: list[dict[str, Any]]
    user_recommendations: list[dict[str, Any]]
    trend_intelligence_snapshots: list[dict[str, Any]]


class LifecycleCounts(BaseModel):
    emerging: int
    growing: int
    peaking: int
    declining: int


class TopOpportunityItem(BaseModel):
    trend_id: int
    trend_name: str | None = None
    image_url: str | None = None
    velocity: float = 0.0
    predicted_growth_14d: float = 0.0
    lifecycle_stage: str = "EMERGING"
    trend_score: float = 0.0
    competition_score: float = 0.0
    profit_score: float = 0.0
    price_min: float = 0.0
    price_max: float = 0.0
    suggested_action: str = "IGNORE"
    risk_level: str = "MEDIUM"
    entry_timing: str = "WAIT_AND_MONITOR"
    suggested_inventory: str = ""
    competition_level: str


class AlertItem(BaseModel):
    id: int
    trend_id: int | None = None
    alert_level: str | None = None
    message: str | None = None
    created_at: str | None = None


class DashboardSummaryResponse(BaseModel):
    lifecycle_counts: LifecycleCounts
    top_opportunities: list[TopOpportunityItem]
    live_alerts: list[AlertItem]
    confidence_score: float
    active_trends_count: int = 0
    total_catalog_profit_potential: float = 0.0


class NotificationsResponse(BaseModel):
    items: list[AlertItem]


class BudgetPickItem(BaseModel):
    trend_id: int | None = None
    trend_name: str | None = None
    image_url: str | None = None
    category: str | None = None
    action: str | None = None
    risk: str | None = None
    units: int
    allocation: float
    profit_score: float


class OpportunitiesAnalyzeResponse(BaseModel):
    budget: float
    recommended_products: list[BudgetPickItem]
    remaining_budget: float


class TrendListItem(BaseModel):
    id: int
    name: str | None = None
    category: str | None = None
    image_url: str | None = None
    strength: float = 0.0
    frequency: float = 0.0
    velocity: float = 0.0
    predicted_growth_14d: float = 0.0
    trend_score: float = 0.0
    lifecycle_stage: str = "EMERGING"
    product_category: str = "general"
    competition_score: float = 0.0
    profit_score: float = 0.0
    price_min: float = 0.0
    price_max: float = 0.0
    suggested_action: str = "IGNORE"
    risk_level: str = "MEDIUM"
    entry_timing: str = "WAIT_AND_MONITOR"
    suggested_inventory: str = ""
    competition_level: str


class TrendListResponse(BaseModel):
    items: list[TrendListItem]


class TimeSeriesBlock(BaseModel):
    labels: list[str]
    mentions: list[int]
    engagement: list[float]


class KeywordClusterItem(BaseModel):
    keyword: str
    count: int


class TrendDetailResponse(BaseModel):
    id: int
    name: str | None = None
    category: str | None = None
    image_url: str | None = None
    strength: float = 0.0
    frequency: float = 0.0
    total_engagement: float = 0.0
    avg_engagement: float = 0.0
    velocity: float = 0.0
    predicted_growth_14d: float = 0.0
    trend_score: float = 0.0
    lifecycle_stage: str = "EMERGING"
    product_category: str = "general"
    price_min: float = 0.0
    price_max: float = 0.0
    demand_score: float = 0.0
    competition_score: float = 0.0
    profit_score: float = 0.0
    suggested_action: str = "IGNORE"
    suggested_inventory: str = ""
    entry_timing: str = "WAIT_AND_MONITOR"
    risk_level: str = "MEDIUM"
    reasoning: str = ""
    competition_level: str
    series_7d: TimeSeriesBlock
    series_30d: TimeSeriesBlock
    series_90d: TimeSeriesBlock
    keyword_clusters: list[KeywordClusterItem]
    alerts: list[AlertItem]


class UserSummary(BaseModel):
    id: int
    name: str | None = None
    budget: float | None = None
    risk_tolerance: str | None = None
    preferred_categories: str | None = None
    experience_level: str | None = None


class UserRecommendationItem(BaseModel):
    id: int
    allocated_budget: float | None = None
    expected_return: float | None = None
    confidence: float | None = None
    status: str | None = None
    created_at: str | None = None
    suggested_action: str | None = None
    suggested_inventory: str | None = None
    entry_timing: str | None = None
    risk_level: str | None = None
    reasoning: str | None = None
    trend_id: int | None = None
    trend_name: str | None = None


class UserRecommendationsResponse(BaseModel):
    user: UserSummary
    items: list[UserRecommendationItem]


class StrategyPickIn(BaseModel):
    trend_id: int
    allocation: float = 0.0
    profit_score: float = 0.0


class SaveStrategyBody(BaseModel):
    picks: list[StrategyPickIn]


class SaveStrategyResponse(BaseModel):
    ok: bool
    saved: int


class AiAnalystResponse(BaseModel):
    answer: str
    intent: str
    trend: str | None = None
    sources: list[str] = Field(default_factory=list)
    mock: bool = False


class PipelineIncrementalResponse(BaseModel):
    ok: bool
    message: str


class IngestSignalRequest(BaseModel):
    """Real-time market signal (e.g. social webhook payload)."""

    source: str = "webhook"
    content: str
    engagement: int | None = None
    ingestion_channel: str = "webhook"
    refresh_pipeline: bool = False


class IngestSignalResponse(BaseModel):
    raw_id: int
    refresh_started: bool


class IngestExternalRequest(BaseModel):
    """Trigger SerpApi-backed ingestion (no HTML scraping)."""

    keywords: list[str] | None = None
    refresh_pipeline: bool = False
    geo: str | None = Field(
        default=None,
        description="Google Trends geo (e.g. PH). Omit to use GOOGLE_TRENDS_GEO.",
    )


class IngestExternalResponse(BaseModel):
    ok: bool
    inserted: int
    errors: list[str] = Field(default_factory=list)
    detail: str


class ResellerBlueprintRequest(BaseModel):
    """Live demand (Google Trends) + marketplace hints (Google `site:` via SerpApi)."""

    keyword: str = Field(..., min_length=1, max_length=120)
    geo: str | None = Field(
        default=None,
        description="Google Trends geo (e.g. PH). Omit for GOOGLE_TRENDS_GEO.",
    )
    include_lazada: bool = True

    @field_validator("keyword")
    @classmethod
    def strip_keyword(cls, v: str) -> str:
        t = (v or "").strip()
        if not t:
            raise ValueError("keyword cannot be empty")
        return t


class MarketplaceListingSample(BaseModel):
    title: str = ""
    snippet: str = ""
    link: str | None = None
    source_label: str = ""


class ResellerPricesPhp(BaseModel):
    min: float | None = None
    max: float | None = None
    avg: float | None = None
    parsed_quote_count: int = 0


class DemandSnapshot(BaseModel):
    relative_interest_tail: int = 0
    trends_period: str = ""
    geo: str | None = None


class MarketplaceBlueprintSection(BaseModel):
    samples: list[MarketplaceListingSample] = Field(default_factory=list)
    prices_php: ResellerPricesPhp = Field(default_factory=ResellerPricesPhp)
    listing_hits: int = 0
    sources_tried: list[str] = Field(default_factory=list)


class ResellerMathBlock(BaseModel):
    currency: str = "PHP"
    est_retail_avg_php: float | None = None
    est_buy_floor_php: float | None = None
    est_profit_per_unit_php: float | None = None
    roi_percent: float | None = None
    listing_hits: int = 0
    methodology: str = ""


class ResellerBlueprintResponse(BaseModel):
    ok: bool
    keyword: str
    mock_ai: bool = False
    errors: list[str] = Field(default_factory=list)
    demand: DemandSnapshot
    marketplace: MarketplaceBlueprintSection
    reseller_math: ResellerMathBlock
    consultant_note: str


class TrendIntelSnapshotItem(BaseModel):
    id: int
    trend_id: int
    trend_score: float = 0.0
    profit_score: float = 0.0
    lifecycle_stage: str | None = None
    frequency: float = 0.0
    recorded_at: str | None = None


class TrendIntelHistoryResponse(BaseModel):
    items: list[TrendIntelSnapshotItem]
