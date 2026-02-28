import time
from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncDriver
from app.api.dependencies import get_neo4j, get_settings, Settings
from app.services import neo4j_service, claude_service
from app.models.graph_models import SearchRequest, SearchResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/", response_model=SearchResponse)
async def natural_language_search(
    body: SearchRequest,
    driver: AsyncDriver = Depends(get_neo4j),
    settings: Settings = Depends(get_settings),
):
    """
    Translate a natural language research question into Cypher,
    execute it, and return results with a narrative explanation.
    """
    start = time.time()

    # Step 1: Generate Cypher
    cypher_result = await claude_service.natural_language_to_cypher(
        settings.gemini_api_key, body.question
    )
    cypher = cypher_result.get("cypher", "MATCH (c:Case) RETURN c.caption AS caseName LIMIT 10")
    explanation = cypher_result.get("explanation", "")
    params = cypher_result.get("parameters", {})
    used_fallback = cypher_result.get("isFallback", False)

    # Step 2: Execute Cypher (read-only guard already applied in claude_service)
    try:
        results = await neo4j_service.run_raw_cypher(driver, cypher, params)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Cypher execution failed: {str(e)}. Query: {cypher}",
        )

    # Step 3: Narrate results
    narrative = await claude_service.narrate_graph_results(
        settings.gemini_api_key, body.question, cypher, results
    )

    elapsed_ms = int((time.time() - start) * 1000)

    return SearchResponse(
        question=body.question,
        cypher=cypher,
        cypherExplanation=explanation,
        results=results,
        narrative=narrative,
        processingTimeMs=elapsed_ms,
        usedFallback=used_fallback,
    )
