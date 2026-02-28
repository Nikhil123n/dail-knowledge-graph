from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReviewItem(BaseModel):
    id: str
    caseId: str
    caseCaption: Optional[str] = None
    type: str  # entity, classification, ai_system
    payload: dict
    confidence: float
    status: str = "pending"  # pending, approved, rejected
    createdAt: str
    rawText: Optional[str] = None


class ReviewStats(BaseModel):
    pending: int
    approved: int
    rejected: int
    avgConfidence: float


class ApprovalRequest(BaseModel):
    pass  # no body needed


class RejectionRequest(BaseModel):
    correction: dict
