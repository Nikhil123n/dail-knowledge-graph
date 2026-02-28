from fastapi import APIRouter, Depends, Query
from neo4j import AsyncDriver
from app.api.dependencies import get_neo4j
from app.services import neo4j_service

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/overview")
async def graph_overview(driver: AsyncDriver = Depends(get_neo4j)):
    """Return node and relationship counts for the whole graph (including documents and secondary sources)."""
    return await neo4j_service.get_node_counts(driver)


@router.get("/defendants")
async def top_defendants(
    limit: int = Query(20, ge=1, le=100),
    driver: AsyncDriver = Depends(get_neo4j),
):
    """Return organizations ranked by number of cases in which they are named defendants."""
    return await neo4j_service.get_top_defendants(driver, limit=limit)


@router.get("/defendants/{org_name}/cases")
async def defendant_cases(org_name: str, driver: AsyncDriver = Depends(get_neo4j)):
    """Return all cases for a given defendant organization."""
    return await neo4j_service.get_defendant_cases(driver, org_name)


@router.get("/ai-systems")
async def top_ai_systems(
    limit: int = Query(15, ge=1, le=50),
    driver: AsyncDriver = Depends(get_neo4j),
):
    """Return AI systems ranked by number of cases they appear in."""
    return await neo4j_service.get_top_ai_systems(driver, limit=limit)


@router.get("/theories/{theory_name}/cases")
async def cases_by_theory(theory_name: str, driver: AsyncDriver = Depends(get_neo4j)):
    """Return all cases asserting a particular legal theory."""
    return await neo4j_service.get_cases_by_theory(driver, theory_name)
