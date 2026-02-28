from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class CaseNode(BaseModel):
    id: str
    caption: str
    briefDescription: Optional[str] = None
    areaOfApplication: List[str] = []
    causeOfAction: List[str] = []
    issues: List[str] = []
    algorithmNames: List[str] = []
    jurisdictionType: Optional[str] = None
    jurisdictionFiled: Optional[str] = None
    status: Optional[str] = None
    dateFiled: Optional[str] = None
    isClassAction: Optional[str] = None
    summarySignificance: Optional[str] = None
    source: Optional[str] = "dail"
    autoClassified: bool = False
    classificationConfidence: Optional[float] = None


class OrganizationNode(BaseModel):
    canonicalName: str
    name: Optional[str] = None
    type: Optional[str] = None


class AISystemNode(BaseModel):
    name: str
    category: Optional[str] = None  # LLM, biometric, autonomous, recommender, classifier, other


class LegalTheoryNode(BaseModel):
    name: str


class CourtNode(BaseModel):
    name: str
    jurisdictionType: Optional[str] = None


class RelationshipDetail(BaseModel):
    type: str
    properties: dict = {}


class CaseNeighbors(BaseModel):
    case: CaseNode
    organizations: List[dict] = []
    aiSystems: List[dict] = []
    legalTheories: List[str] = []
    courts: List[str] = []


class DefendantRanking(BaseModel):
    canonicalName: str
    caseCount: int
    activeCount: int
    inactiveCount: int


class GraphOverview(BaseModel):
    cases: int
    organizations: int
    aiSystems: int
    legalTheories: int
    courts: int
    relationships: int


class StagingCase(BaseModel):
    clSourceId: str
    caption: str
    courtName: Optional[str] = None
    dateFiled: Optional[str] = None
    docketNumber: Optional[str] = None
    absoluteUrl: Optional[str] = None


class WaveSignal(BaseModel):
    defendant: str
    caseCount: int
    theories: List[str] = []
    jurisdictions: List[str] = []
    narrative: Optional[str] = None


class SearchRequest(BaseModel):
    question: str
    mode: str = "hybrid"  # structured, semantic, hybrid


class SearchResponse(BaseModel):
    question: str
    cypher: str
    cypherExplanation: str
    results: List[dict]
    narrative: str
    processingTimeMs: int
    usedFallback: bool = False
