from fastapi import APIRouter, Depends, BackgroundTasks
from neo4j import AsyncDriver
from app.api.dependencies import get_neo4j, get_settings, Settings
from app.services import neo4j_service
from app.services.wave_detector import detect_waves
from app.ingest.scheduler import ingest_new_cases

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/trigger")
async def trigger_ingest(
    background_tasks: BackgroundTasks,
    driver: AsyncDriver = Depends(get_neo4j),
):
    """Manually trigger a CourtListener ingestion run in the background."""
    background_tasks.add_task(ingest_new_cases)
    return {"status": "ingestion started", "message": "Running in background."}


@router.get("/history")
async def ingest_history(driver: AsyncDriver = Depends(get_neo4j)):
    """Return the last 10 ingest run records."""
    return await neo4j_service.get_ingest_history(driver)


@router.get("/staged")
async def staged_cases(driver: AsyncDriver = Depends(get_neo4j)):
    """Return cases ingested from CourtListener that are pending human review."""
    return await neo4j_service.get_staged_cases(driver)


@router.get("/waves")
async def litigation_waves(
    window_days: int = 60,
    threshold: int = 3,
    driver: AsyncDriver = Depends(get_neo4j),
    settings: Settings = Depends(get_settings),
):
    """
    Detect litigation waves — defendants with >= threshold cases
    filed in the last window_days days — with Claude-generated narratives.
    """
    waves = await detect_waves(
        driver,
        settings.gemini_api_key,
        window_days=window_days,
        threshold=threshold,
    )
    return waves
