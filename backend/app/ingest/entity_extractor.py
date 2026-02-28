import asyncio
import json
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from app.services.neo4j_service import get_driver
from app.services.claude_service import extract_entities

load_dotenv()

CONFIDENCE_AUTO = 0.85
CONFIDENCE_MIN = 0.70


async def process_all_cases(driver, api_key: str):
    async with driver.session() as session:
        result = await session.run("""
            MATCH (c:Case)
            WHERE c.organizations IS NOT NULL AND c.organizations <> ''
              AND NOT EXISTS { (c)-[:NAMED_DEFENDANT]->() }
            RETURN c.id AS id, c.caption AS caption,
                   c.organizations AS orgsText,
                   c.algorithmNames AS algoNames
            LIMIT 500
        """)
        cases = [dict(r) async for r in result]

    print(f"Processing {len(cases)} cases for entity extraction...")
    approved = 0
    queued = 0

    for i, case in enumerate(cases):
        algo_text = ", ".join(case.get("algoNames") or [])
        extracted = await extract_entities(
            api_key,
            case["id"],
            case.get("orgsText", ""),
            algo_text,
            case.get("caption", ""),
        )

        async with driver.session() as session:
            # Process organizations
            for org in extracted.get("organizations", []):
                if org.get("confidence", 0) < CONFIDENCE_MIN:
                    continue
                canonical = org.get("canonicalName") or org.get("name", "Unknown")
                if not canonical:
                    continue
                if org["confidence"] >= CONFIDENCE_AUTO:
                    await session.run(
                        """
                        MERGE (o:Organization {canonicalName: $canonical})
                        SET o.name = $name
                        WITH o
                        MATCH (c:Case {id: $caseId})
                        MERGE (c)-[r:NAMED_DEFENDANT]->(o)
                        SET r.roles = $roles, r.confidence = $conf,
                            r.extractedBy = 'claude', r.reviewedByHuman = false
                    """,
                        canonical=canonical,
                        name=org.get("name", canonical),
                        caseId=case["id"],
                        roles=org.get("roles", []),
                        conf=org["confidence"],
                    )
                    approved += 1
                else:
                    item_id = str(uuid.uuid4())
                    await session.run(
                        """
                        CREATE (r:ReviewItem {
                            id: $id, caseId: $caseId, type: 'entity',
                            payload: $payload, confidence: $conf,
                            status: 'pending', createdAt: $ts,
                            rawText: $rawText
                        })
                    """,
                        id=item_id,
                        caseId=case["id"],
                        payload=json.dumps(org),
                        conf=org["confidence"],
                        ts=datetime.utcnow().isoformat(),
                        rawText=case.get("orgsText", ""),
                    )
                    queued += 1

            # Process AI systems
            for system in extracted.get("aiSystems", []):
                if system.get("confidence", 0) < CONFIDENCE_MIN:
                    continue
                if system["confidence"] >= CONFIDENCE_AUTO:
                    await session.run(
                        """
                        MERGE (s:AISystem {name: $name})
                        SET s.category = $category
                        WITH s
                        MATCH (c:Case {id: $caseId})
                        MERGE (c)-[r:INVOLVES_SYSTEM]->(s)
                        SET r.confidence = $conf, r.reviewedByHuman = false
                    """,
                        name=system["name"],
                        category=system.get("category", "other"),
                        caseId=case["id"],
                        conf=system["confidence"],
                    )
                else:
                    item_id = str(uuid.uuid4())
                    await session.run(
                        """
                        CREATE (r:ReviewItem {
                            id: $id, caseId: $caseId, type: 'ai_system',
                            payload: $payload, confidence: $conf,
                            status: 'pending', createdAt: $ts
                        })
                    """,
                        id=item_id,
                        caseId=case["id"],
                        payload=json.dumps(system),
                        conf=system["confidence"],
                        ts=datetime.utcnow().isoformat(),
                    )
                    queued += 1

        if (i + 1) % 10 == 0:
            print(
                f"  Processed {i + 1}/{len(cases)} cases... "
                f"(approved: {approved}, queued: {queued})"
            )
            await asyncio.sleep(1)  # Rate limit courtesy

    print(
        f"\nEntity extraction complete: {approved} auto-approved, {queued} queued for review"
    )


async def main():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "dail_password")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in .env")
    driver = await get_driver(uri, user, password)
    await process_all_cases(driver, api_key)
    await driver.close()


if __name__ == "__main__":
    asyncio.run(main())
