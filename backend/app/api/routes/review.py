from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from neo4j import AsyncDriver
from app.api.dependencies import get_neo4j
from app.services import neo4j_service
from app.models.review_models import RejectionRequest

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/queue")
async def get_review_queue(
    type: Optional[str] = Query(None, description="Filter by type: entity, classification, ai_system"),
    limit: int = Query(20, ge=1, le=100),
    driver: AsyncDriver = Depends(get_neo4j),
):
    """Return pending review items ordered by lowest confidence first."""
    return await neo4j_service.get_review_queue(driver, item_type=type, limit=limit)


@router.get("/stats")
async def review_stats(driver: AsyncDriver = Depends(get_neo4j)):
    """Return counts of pending/approved/rejected review items."""
    return await neo4j_service.get_review_stats(driver)


@router.post("/{item_id}/approve")
async def approve_item(item_id: str, driver: AsyncDriver = Depends(get_neo4j)):
    """Approve a review item and mark its relationships as human-reviewed."""
    ok = await neo4j_service.approve_review_item(driver, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Review item '{item_id}' not found")
    return {"status": "approved", "id": item_id}


@router.post("/{item_id}/reject")
async def reject_item(
    item_id: str,
    body: RejectionRequest,
    driver: AsyncDriver = Depends(get_neo4j),
):
    """Reject a review item and log the human correction."""
    ok = await neo4j_service.reject_review_item(driver, item_id, body.correction)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Review item '{item_id}' not found")
    return {"status": "rejected", "id": item_id, "correction": body.correction}
