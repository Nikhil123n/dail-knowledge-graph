import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dependencies import get_settings
from app.api.routes import cases, graph, review, search, ingest
from app.services import neo4j_service
from app.ingest.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    logger.info("Connecting to Neo4j and initializing schema...")
    driver = await neo4j_service.get_driver(
        settings.neo4j_uri,
        settings.neo4j_user,
        settings.neo4j_password,
    )
    await neo4j_service.init_schema(driver)
    logger.info("Starting CourtListener ingestion scheduler...")
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()
    await neo4j_service.close_driver()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="DAIL Living Case Graph API",
    description=(
        "Knowledge graph backend for the Database of AI Litigation (GWU Law). "
        "Connects 375+ AI litigation cases through semantic relationships with "
        "live ingestion and a conversational research interface."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for hackathon demo; restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(cases.router, prefix="/api/v1")
app.include_router(graph.router, prefix="/api/v1")
app.include_router(review.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")


@app.get("/", tags=["health"])
async def root():
    return {
        "name": "DAIL Living Case Graph API",
        "version": "1.0.0",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    settings = get_settings()
    try:
        driver = await neo4j_service.get_driver(
            settings.neo4j_uri,
            settings.neo4j_user,
            settings.neo4j_password,
        )
        overview = await neo4j_service.get_node_counts(driver)
        return {"status": "ok", "neo4j": "connected", "graph": overview}
    except Exception as e:
        return {"status": "degraded", "neo4j": "unavailable", "error": str(e)}
