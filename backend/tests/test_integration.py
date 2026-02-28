"""
Integration tests for the DAIL Living Case Graph API.
Run with: pytest tests/ -v (from backend/ directory with Neo4j running)
"""
import pytest
import asyncio
import os
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

# Use test env vars
os.environ.setdefault("NEO4J_URI", "bolt://localhost:7687")
os.environ.setdefault("NEO4J_USER", "neo4j")
os.environ.setdefault("NEO4J_PASSWORD", "dail_password")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")


# ---- Unit tests for pure functions ----

def test_clean_val_handles_nan():
    import pandas as pd
    from app.ingest.seed_from_excel import clean_val
    assert clean_val(float("nan")) == ""
    assert clean_val(None) == "None"
    assert clean_val("  hello  ") == "hello"


def test_clean_list_parses_csv():
    from app.ingest.seed_from_excel import clean_list
    result = clean_list("Title VII, ADA Violation, ADEA")
    assert result == ["Title VII", "ADA Violation", "ADEA"]


def test_clean_list_filters_empties():
    from app.ingest.seed_from_excel import clean_list
    result = clean_list(",,nan,none,  ,")
    assert result == []


def test_clean_date_formats_iso():
    from app.ingest.seed_from_excel import clean_date
    assert clean_date("2023-07-11") == "2023-07-11"
    assert clean_date("07/11/2023") == "2023-07-11"
    assert clean_date("not-a-date") is None


def test_strip_code_fences():
    from app.services.claude_service import _strip_code_fences
    fenced = "```json\n{\"key\": \"value\"}\n```"
    result = _strip_code_fences(fenced)
    assert result == '{"key": "value"}'


def test_strip_code_fences_plain():
    from app.services.claude_service import _strip_code_fences
    plain = '{"key": "value"}'
    assert _strip_code_fences(plain) == plain


# ---- Pydantic model tests ----

def test_search_request_defaults():
    from app.models.graph_models import SearchRequest
    req = SearchRequest(question="Who sued OpenAI?")
    assert req.mode == "hybrid"


def test_wave_signal_model():
    from app.models.graph_models import WaveSignal
    wave = WaveSignal(defendant="OpenAI", caseCount=5)
    assert wave.theories == []
    assert wave.jurisdictions == []


def test_staging_case_optional_fields():
    from app.models.graph_models import StagingCase
    case = StagingCase(clSourceId="123", caption="Test v. Company")
    assert case.dateFiled is None
    assert case.courtName is None


# ---- CourtListener client tests ----

@pytest.mark.asyncio
async def test_courtlistener_parse_to_staging():
    from app.services.courtlistener import CourtListenerClient
    client = CourtListenerClient()
    docket = {
        "id": 42,
        "case_name": "Doe v. Google LLC",
        "court_id": "cand",
        "date_filed": "2023-07-11",
        "docket_number": "3:23-cv-03223",
        "absolute_url": "/docket/42/",
    }
    staging = client.parse_to_staging(docket)
    assert staging.clSourceId == "42"
    assert staging.caption == "Doe v. Google LLC"
    assert staging.dateFiled == "2023-07-11"
    assert staging.docketNumber == "3:23-cv-03223"
    await client.aclose()


@pytest.mark.asyncio
async def test_courtlistener_search_handles_error():
    from app.services.courtlistener import CourtListenerClient
    client = CourtListenerClient(base_url="http://invalid-host-that-does-not-exist.local")
    # Should return empty list, not raise
    results = await client.search("AI", "2024-01-01", limit=5)
    assert results == []
    await client.aclose()


# ---- Claude service tests (mocked) ----

@pytest.mark.asyncio
async def test_extract_entities_returns_empty_on_failure():
    from app.services.claude_service import extract_entities
    with patch("app.services.claude_service.get_client") as mock_get:
        mock_client = AsyncMock()
        mock_get.return_value = mock_client
        mock_client.messages.create.side_effect = Exception("API down")
        result = await extract_entities("key", "c1", "Google", "GPT", "Test v. Google")
    assert result == {"organizations": [], "aiSystems": []}


@pytest.mark.asyncio
async def test_classify_returns_non_ai_on_error():
    from app.services.claude_service import classify_incoming_case
    with patch("app.services.claude_service.get_client") as mock_get:
        mock_client = AsyncMock()
        mock_get.return_value = mock_client
        mock_client.messages.create.side_effect = Exception("API down")
        result = await classify_incoming_case("key", "Smith v. Doe", "SDNY", "2024-01-01", "")
    assert result["isAiLitigation"] is False
    assert result["confidence"] == 0.0


@pytest.mark.asyncio
async def test_nl_to_cypher_safety_guard():
    from app.services.claude_service import natural_language_to_cypher
    with patch("app.services.claude_service.get_client") as mock_get:
        mock_client = AsyncMock()
        mock_get.return_value = mock_client
        # Simulate Claude returning a dangerous query
        dangerous_response = MagicMock()
        dangerous_response.content = [MagicMock(text='{"cypher": "MATCH (n) DETACH DELETE n", "explanation": "evil", "parameters": {}}')]
        mock_client.messages.create = AsyncMock(return_value=dangerous_response)
        result = await natural_language_to_cypher("key", "delete all cases")
    # Should fall back to safe query
    assert "DELETE" not in result["cypher"]


# ---- Graph models tests ----

def test_graph_overview_model():
    from app.models.graph_models import GraphOverview
    overview = GraphOverview(cases=375, organizations=120, aiSystems=45,
                             legalTheories=30, courts=90, relationships=1200)
    assert overview.cases == 375


def test_defendant_ranking_model():
    from app.models.graph_models import DefendantRanking
    ranking = DefendantRanking(canonicalName="Google LLC", caseCount=15,
                               activeCount=10, inactiveCount=5)
    assert ranking.caseCount == 15


# ---- FastAPI app integration tests ----

@pytest.mark.asyncio
async def test_health_endpoint():
    """Test that the health endpoint returns without crashing."""
    from app.main import app
    # Mock Neo4j to avoid requiring a real database
    with patch("app.services.neo4j_service.get_driver") as mock_driver_fn:
        mock_driver = AsyncMock()
        mock_driver_fn.return_value = mock_driver
        with patch("app.services.neo4j_service.init_schema", new_callable=AsyncMock):
            with patch("app.ingest.scheduler.start_scheduler"):
                with patch("app.ingest.scheduler.stop_scheduler"):
                    async with AsyncClient(
                        transport=ASGITransport(app=app),
                        base_url="http://test",
                    ) as client:
                        with patch("app.services.neo4j_service.get_graph_overview", new_callable=AsyncMock) as mock_overview:
                            mock_overview.return_value = {
                                "cases": 0, "organizations": 0, "aiSystems": 0,
                                "legalTheories": 0, "courts": 0, "relationships": 0
                            }
                            r = await client.get("/health")
                            assert r.status_code in (200, 503)


@pytest.mark.asyncio
async def test_root_endpoint():
    from app.main import app
    with patch("app.services.neo4j_service.get_driver", new_callable=AsyncMock):
        with patch("app.services.neo4j_service.init_schema", new_callable=AsyncMock):
            with patch("app.ingest.scheduler.start_scheduler"):
                with patch("app.ingest.scheduler.stop_scheduler"):
                    async with AsyncClient(
                        transport=ASGITransport(app=app),
                        base_url="http://test",
                    ) as client:
                        r = await client.get("/")
                        assert r.status_code == 200
                        data = r.json()
                        assert data["name"] == "DAIL Living Case Graph API"
