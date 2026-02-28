"""
AI service — backed by Google Gemini (google-genai SDK).
All public function signatures are identical to the original Claude version
so no callers need to change.
"""
from google import genai
from google.genai import types
import json
import re
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

MODEL = "gemini-2.5-flash"

_client: Optional[genai.Client] = None


def get_client(api_key: str) -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=api_key)
    return _client


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def _extract_json(text: str) -> dict:
    """Parse JSON from model output, falling back to regex extraction."""
    cleaned = _strip_code_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find a JSON object anywhere in the text
        match = re.search(r'\{[\s\S]*\}', cleaned)
        if match:
            return json.loads(match.group())
        raise


async def _generate(
    api_key: str, system: str, user: str, max_tokens: int = 1024, json_mode: bool = False
) -> str:
    """Shared async wrapper around Gemini generate_content."""
    client = get_client(api_key)
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.2,
        max_output_tokens=max_tokens,
        response_mime_type="application/json" if json_mode else "text/plain",
    )
    response = await client.aio.models.generate_content(
        model=MODEL,
        contents=user,
        config=config,
    )
    return response.text.strip()


async def extract_entities(
    api_key: str,
    case_id: str,
    organizations_text: str,
    algorithm_text: str,
    caption: str,
) -> dict:
    """Extract Organization and AISystem entities from raw DAIL case text."""
    system = (
        "You are a legal entity extractor for an AI litigation database. "
        "Extract organizations and AI systems from case text. "
        "Always respond with valid JSON only, no prose, no markdown code fences."
    )
    user = (
        f"Case: {caption}\n"
        f"Organizations text: {organizations_text}\n"
        f"Algorithm names: {algorithm_text}\n\n"
        "Return JSON with this exact schema:\n"
        '{"organizations": [{"name": string, "canonicalName": string, '
        '"roles": ["plaintiff"|"defendant"|"third_party"], "confidence": float}], '
        '"aiSystems": [{"name": string, '
        '"category": "LLM"|"biometric"|"autonomous"|"recommender"|"classifier"|"other", '
        '"confidence": float}]}'
    )
    for attempt in range(3):
        try:
            text = await _generate(api_key, system, user, max_tokens=2048, json_mode=True)
            result = _extract_json(text)
            logger.info(
                f"Extracted entities for {case_id}: "
                f"{len(result.get('organizations', []))} orgs, "
                f"{len(result.get('aiSystems', []))} systems."
            )
            return result
        except Exception as e:
            logger.warning(f"Entity extraction attempt {attempt + 1} failed for {case_id}: {e}")
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    return {"organizations": [], "aiSystems": []}


async def classify_incoming_case(
    api_key: str,
    caption: str,
    court_name: str,
    date_filed: str,
    snippet: str,
) -> dict:
    """Classify a CourtListener case as AI litigation and assign preliminary DAIL labels."""
    system = (
        "You are a classifier for an AI litigation database. "
        "Classify incoming court cases. Respond with JSON only, no prose, no markdown."
    )
    user = (
        f"Case caption: {caption}\n"
        f"Court: {court_name}\n"
        f"Filed: {date_filed}\n"
        f"Text snippet: {snippet[:1000]}\n\n"
        "Respond with JSON:\n"
        '{"isAiLitigation": bool, "confidence": float (0-1), '
        '"areaOfApplication": [list from: Generative AI, Facial Recognition, '
        "Autonomous Vehicles, Employment, Healthcare, Housing, Criminal Justice, "
        "Intellectual Property, Social Media, Other], "
        '"causeOfAction": [list of up to 3 strings], '
        '"primaryDefendantType": string, "reasoning": string}'
    )
    try:
        text = await _generate(api_key, system, user, max_tokens=512, json_mode=True)
        return _extract_json(text)
    except Exception as e:
        logger.error(f"Classification failed for '{caption}': {e}")
        return {
            "isAiLitigation": False,
            "confidence": 0.0,
            "areaOfApplication": [],
            "causeOfAction": [],
            "primaryDefendantType": "",
            "reasoning": "error",
        }


async def natural_language_to_cypher(api_key: str, question: str) -> dict:
    """Translate a natural language research question to a Neo4j Cypher query."""
    system = (
        "You are a Neo4j Cypher query generator for an AI litigation knowledge graph.\n"
        "Node types: Case, Organization, AISystem, LegalTheory, Court\n"
        "Key relationships:\n"
        "  (Case)-[:NAMED_DEFENDANT]->(Organization)\n"
        "  (Case)-[:INVOLVES_SYSTEM]->(AISystem)\n"
        "  (Case)-[:ASSERTS_CLAIM]->(LegalTheory)\n"
        "  (Case)-[:FILED_IN]->(Court)\n"
        "  (Case)-[:HAS_DOCKET]->(Docket)\n"
        "  (Case)-[:HAS_DOCUMENT]->(Document)\n"
        "  (Case)-[:HAS_SECONDARY_SOURCE]->(SecondarySource)\n"
        "Case properties: id, caption, status, dateFiled, jurisdictionType, "
        "areaOfApplication (list), causeOfAction (list), algorithmNames (list), "
        "isClassAction, summarySignificance\n"
        "Organization properties: canonicalName, name\n"
        "AISystem properties: name, category\n\n"
        "Rules:\n"
        "- Always LIMIT results to 50 maximum\n"
        "- Only generate read queries (MATCH/RETURN/WITH)\n"
        "- Never use DETACH DELETE, DROP, CREATE, MERGE, SET, REMOVE\n"
        "- Return JSON only, no prose, no markdown: "
        '{"cypher": string, "explanation": string, "parameters": {}}'
    )
    user = f"Research question: {question}\n\nGenerate the Cypher query."
    try:
        text = await _generate(api_key, system, user, max_tokens=1024, json_mode=True)
        result = _extract_json(text)
        # Safety guard: block write operations
        cypher = result.get("cypher", "")
        for word in ["DELETE", "DROP", "CREATE", "MERGE", "SET ", "REMOVE"]:
            if word in cypher.upper():
                raise ValueError(f"Forbidden Cypher keyword: {word}")
        return result
    except Exception as e:
        logger.error(f"Cypher generation failed: {e}")
        return {
            "cypher": "MATCH (c:Case) RETURN c.caption, c.status LIMIT 10",
            "explanation": "Fallback query — original question could not be parsed.",
            "parameters": {},
        }


async def narrate_graph_results(
    api_key: str,
    question: str,
    cypher: str,
    results: list,
) -> str:
    """Narrate the graph query results in plain legal English."""
    system = (
        "You are a legal research assistant explaining graph database query results "
        "to a law researcher. Be specific, cite case names, and explain what the "
        "graph traversal path reveals about the AI litigation landscape."
    )
    user = (
        f"Original question: {question}\n"
        f"Cypher query executed: {cypher}\n"
        f"Results (first 20 of {len(results)}): {json.dumps(results[:20], default=str)}\n\n"
        "Write a 3-5 sentence narrative explaining:\n"
        "1. What the graph traversal found\n"
        "2. The most significant patterns or entities in the results\n"
        "3. What this means for the researcher's question\n"
        "End with one concrete suggested follow-up question they could ask."
    )
    try:
        return await _generate(api_key, system, user, max_tokens=512)
    except Exception as e:
        logger.error(f"Narration failed: {e}")
        return f"Found {len(results)} results for your query about AI litigation."


async def describe_wave(
    api_key: str,
    defendant: str,
    case_count: int,
    theories: list,
    jurisdictions: list,
) -> str:
    """Write a 2-3 sentence wave briefing note for the research team."""
    system = (
        "You are a legal analyst writing briefing notes about litigation trends. "
        "Be concise and specific."
    )
    user = (
        f"Litigation wave detected:\n"
        f"Defendant: {defendant}\n"
        f"Cases in last 60 days: {case_count}\n"
        f"Legal theories: {', '.join(theories[:5])}\n"
        f"Jurisdictions: {', '.join(list(set(j for j in jurisdictions if j))[:5])}\n\n"
        "Write a 2-3 sentence briefing note for a legal research team explaining "
        "the significance of this litigation cluster."
    )
    try:
        return await _generate(api_key, system, user, max_tokens=256)
    except Exception as e:
        logger.error(f"Wave description failed: {e}")
        return (
            f"{case_count} cases filed against {defendant} in the last 60 days "
            f"involving {', '.join(theories[:3])}."
        )
