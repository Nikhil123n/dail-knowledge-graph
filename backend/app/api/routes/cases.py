from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from neo4j import AsyncDriver
from app.api.dependencies import get_neo4j
from app.services import neo4j_service

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/")
async def list_cases(
    status: Optional[str] = Query(None, description="Filter by status (Active/Inactive)"),
    jurisdiction_type: Optional[str] = Query(None, alias="jurisdictionType"),
    area: Optional[str] = Query(None, description="Filter by area of application"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    driver: AsyncDriver = Depends(get_neo4j),
):
    """List cases with optional filters."""
    return await neo4j_service.get_cases_list(
        driver, status, jurisdiction_type, area, limit, skip
    )


@router.get("/{case_id}")
async def get_case(case_id: str, driver: AsyncDriver = Depends(get_neo4j)):
    """Get a single case by ID."""
    case = await neo4j_service.get_case_by_id(driver, case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return case


@router.get("/{case_id}/neighbors")
async def get_case_neighbors(case_id: str, driver: AsyncDriver = Depends(get_neo4j)):
    """Get a case with all its connected entities (organizations, AI systems, theories, courts)."""
    neighbors = await neo4j_service.get_case_neighbors(driver, case_id)
    if not neighbors:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    return neighbors


@router.get("/{case_id}/similar")
async def get_similar_cases(case_id: str, driver: AsyncDriver = Depends(get_neo4j)):
    """Find cases similar to the given case (shared defendants or legal theories)."""
    return await neo4j_service.get_similar_cases(driver, case_id)


@router.get("/{case_id}/secondary-sources")
async def get_secondary_sources(case_id: str, driver: AsyncDriver = Depends(get_neo4j)):
    """Return all secondary sources (news articles, blog posts) linked to a case."""
    return await neo4j_service.get_secondary_sources(driver, case_id)
