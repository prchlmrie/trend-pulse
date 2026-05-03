#main.py
import asyncio
import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import create_tables, get_connection
from app.db.session import get_db
from app.routers import auth as auth_routes
from app.routers.auth import get_current_user_id
from app.pipeline import run_incremental_pipeline, run_pipeline
from app.schemas.api import (
    AiAnalystResponse,
    AllTablesResponse,
    DashboardSummaryResponse,
    DataTablesResponse,
    IngestExternalRequest,
    IngestExternalResponse,
    IngestSignalRequest,
    IngestSignalResponse,
    NotificationsResponse,
    OpportunitiesAnalyzeResponse,
    PipelineIncrementalResponse,
    PipelineRunResponse,
    ResellerBlueprintRequest,
    ResellerBlueprintResponse,
    RootResponse,
    SaveStrategyBody,
    SaveStrategyResponse,
    TrendDetailResponse,
    TrendIntelHistoryResponse,
    TrendListResponse,
    UserRecommendationsResponse,
)
from app.services.analyst_service import AnalystService
from app.services.budget_service import BudgetService
from app.services.dashboard_service import DashboardService
from app.services.data_service import DataService
from app.ingestion import run_external_api_ingestion
from app.services.ingest_service import insert_raw_signal
from app.services.notification_service import NotificationService
from app.services.reseller_blueprint_service import build_reseller_blueprint
from app.services.trend_service import TrendService
from app.services.user_service import UserService


class AnalystRequest(BaseModel):
    question: str
    user_id: int | None = None


DbSession = Annotated[AsyncSession, Depends(get_db)]


def _catalog_counts_sync() -> dict[str, int]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM trends")
    trend_count = int(cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM alerts")
    alert_count = int(cur.fetchone()[0])
    conn.close()
    return {"trend_count": trend_count, "alert_count": alert_count}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(create_tables)
    yield


app = FastAPI(lifespan=lifespan, title="TrendPulse API")
app.include_router(auth_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/ai-analyst", response_model=AiAnalystResponse)
async def ai_analyst_endpoint(body: AnalystRequest):
    """
    AI Analyst — answers natural-language questions about trends using live DB data.

    Request body:
        { "question": "Why is risk HIGH for Biodegradable Phone Cases?", "user_id": 1 }

    Response:
        {
            "answer": "...",
            "intent": "RISK_EXPLANATION",
            "trend": "Biodegradable Phone Cases",
            "sources": ["trend: Biodegradable Phone Cases", "trend_metrics", ...],
            "mock": false
        }
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    return await AnalystService.ask(body.question.strip(), body.user_id)


@app.get("/", response_model=RootResponse)
async def root():
    return RootResponse(message="TrendPulse API is running")


@app.post("/pipeline/run", response_model=PipelineRunResponse)
async def run_pipeline_now():
    before = await asyncio.to_thread(_catalog_counts_sync)
    await asyncio.to_thread(run_pipeline)
    after = await asyncio.to_thread(_catalog_counts_sync)
    dt = after["trend_count"] - before["trend_count"]
    da = after["alert_count"] - before["alert_count"]
    msg = (
        f"Pipeline completed. Catalog: {after['trend_count']} trends, {after['alert_count']} alerts "
        f"(change: {dt:+d} trends, {da:+d} alerts)."
    )
    return PipelineRunResponse(
        ok=True,
        message=msg,
        trend_count=after["trend_count"],
        alert_count=after["alert_count"],
        trends_delta=dt,
        alerts_delta=da,
    )


@app.post("/pipeline/incremental", response_model=PipelineIncrementalResponse)
async def run_incremental_pipeline_now():
    """Recompute trends/metrics from DB without re-inserting seed sample rows."""
    await asyncio.to_thread(run_incremental_pipeline)
    return PipelineIncrementalResponse(ok=True, message="Incremental pipeline completed")


@app.post("/api/ingest/signal", response_model=IngestSignalResponse)
async def ingest_market_signal(
    body: IngestSignalRequest,
    x_ingest_token: str | None = Header(default=None, alias="X-Ingest-Token"),
):
    """
    Real-time signal ingestion (webhook-friendly). Inserts into `raw_data`.

    Set env `INGEST_WEBHOOK_TOKEN`; when set, requests must send matching `X-Ingest-Token`.
    Use `refresh_pipeline: true` to run the incremental pipeline after insert (can be slow).
    """
    expected = (os.environ.get("INGEST_WEBHOOK_TOKEN") or "").strip()
    if expected and (x_ingest_token or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Ingest-Token")

    if not body.content.strip():
        raise HTTPException(status_code=400, detail="content cannot be empty")

    raw_id = await asyncio.to_thread(
        insert_raw_signal,
        body.source.strip() or "webhook",
        body.content.strip(),
        body.engagement,
        body.ingestion_channel.strip() or "webhook",
    )
    refresh_started = False
    if body.refresh_pipeline:
        await asyncio.to_thread(run_incremental_pipeline)
        refresh_started = True
    return IngestSignalResponse(raw_id=raw_id, refresh_started=refresh_started)


@app.post("/api/ingest/external", response_model=IngestExternalResponse)
async def ingest_external_apis(
    body: IngestExternalRequest,
    x_ingest_token: str | None = Header(default=None, alias="X-Ingest-Token"),
):
    """
    API-first trend ingestion (Phase 1: SerpApi Google Trends → `raw_data`).

    Uses the same `INGEST_WEBHOOK_TOKEN` / `X-Ingest-Token` guard as `/api/ingest/signal` when set.
    """
    expected = (os.environ.get("INGEST_WEBHOOK_TOKEN") or "").strip()
    if expected and (x_ingest_token or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Ingest-Token")

    result = await asyncio.to_thread(
        run_external_api_ingestion,
        body.keywords,
        body.refresh_pipeline,
        body.geo,
    )
    return IngestExternalResponse(
        ok=True,
        inserted=int(result["inserted"]),
        errors=list(result.get("errors") or []),
        detail=str(result.get("detail") or ""),
    )


@app.post("/api/reseller/blueprint", response_model=ResellerBlueprintResponse)
async def post_reseller_blueprint(body: ResellerBlueprintRequest):
    """
    Dual SerpApi flow: Google Trends (demand) + Google `site:` marketplace rows (₱ hints),
    then NVIDIA reseller-style narrative (or mock if no `NVIDIA_API_KEY`).
    """
    data = await asyncio.to_thread(
        build_reseller_blueprint,
        body.keyword,
        body.geo,
        body.include_lazada,
    )
    return ResellerBlueprintResponse.model_validate(data)


@app.get("/data", response_model=DataTablesResponse)
async def get_data(db: DbSession):
    data = await DataService.get_data_tables(db)
    return DataTablesResponse(**data)


@app.get("/all", response_model=AllTablesResponse)
async def get_all_tables(db: DbSession):
    data = await DataService.get_all_tables(db)
    return AllTablesResponse(**data)


@app.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(db: DbSession):
    return await DashboardService.get_summary(db)


@app.get("/notifications", response_model=NotificationsResponse)
async def get_notifications(db: DbSession, limit: int = Query(20, ge=1, le=100)):
    items = await NotificationService.list_alerts(db, limit)
    return NotificationsResponse(items=items)


@app.get("/opportunities/analyze", response_model=OpportunitiesAnalyzeResponse)
async def analyze_budget(
    db: DbSession,
    budget: float = Query(..., gt=0),
    top_n: int = Query(3, ge=1, le=10),
):
    picks, remaining = await BudgetService.recommend_for_budget(db, budget, top_n=top_n)
    return OpportunitiesAnalyzeResponse(
        budget=budget,
        recommended_products=picks,
        remaining_budget=remaining,
    )


@app.get("/trends", response_model=TrendListResponse)
async def get_trends(
    db: DbSession,
    limit: int = Query(50, ge=1, le=500),
    search: str | None = None,
    lifecycle_stage: str | None = None,
    action: str | None = None,
):
    rows = await TrendService.list_trends(db, limit, search, lifecycle_stage, action)
    return TrendListResponse(items=rows)


@app.get("/trends/{trend_id}", response_model=TrendDetailResponse)
async def get_trend_detail(db: DbSession, trend_id: int):
    return await TrendService.get_detail(db, trend_id)


@app.get("/trends/{trend_id}/intelligence-history", response_model=TrendIntelHistoryResponse)
async def get_trend_intelligence_history(
    db: DbSession,
    trend_id: int,
    limit: int = Query(60, ge=1, le=500),
):
    """Append-only profit/trend score history from each pipeline refresh."""
    rows = await TrendService.get_intelligence_history(db, trend_id, limit)
    return TrendIntelHistoryResponse(items=rows)


@app.get("/users/{user_id}/recommendations", response_model=UserRecommendationsResponse)
async def get_user_recommendations(db: DbSession, user_id: int):
    return await UserService.get_user_recommendations(db, user_id)


@app.post("/users/me/portfolio/strategy", response_model=SaveStrategyResponse)
async def save_finder_strategy_to_portfolio(
    body: SaveStrategyBody,
    db: DbSession,
    user_id: int = Depends(get_current_user_id),
):
    """Persist Opportunity Finder picks for the authenticated user."""
    if not body.picks:
        raise HTTPException(status_code=400, detail="No picks to save.")
    n = await UserService.save_opportunity_picks(db, user_id, [p.model_dump() for p in body.picks])
    if n == 0:
        raise HTTPException(
            status_code=422,
            detail="Could not link picks to recommendations. Run the pipeline so trends have recommendation rows.",
        )
    return SaveStrategyResponse(ok=True, saved=n)
