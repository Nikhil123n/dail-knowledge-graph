import asyncio
import logging
import os
import uuid
import json
from datetime import datetime, timedelta, UTC
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.courtlistener import CourtListenerClient, AI_LITIGATION_KEYWORDS
from app.services.claude_service import classify_incoming_case
from app.services.neo4j_service import get_driver

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def ingest_new_cases() -> dict:
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "dail_password")
    api_key = os.getenv("GEMINI_API_KEY", "")
    driver = await get_driver(uri, user, password)
    cl = CourtListenerClient(
        os.getenv("COURTLISTENER_BASE_URL", "https://www.courtlistener.com")
    )
    filed_after = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    seen_dockets: set = set()
    cases_found = 0
    cases_added = 0
    cases_queued = 0

    try:
        # Limit to 5 keywords per run to respect rate limits
        for keyword in AI_LITIGATION_KEYWORDS[:5]:
            results = await cl.search(keyword, filed_after, limit=10)
            cases_found += len(results)
            for docket in results:
                staging = cl.parse_to_staging(docket)
                if not staging.docketNumber or staging.docketNumber in seen_dockets:
                    continue
                seen_dockets.add(staging.docketNumber)

                # Deduplicate against existing Neo4j cases
                async with driver.session() as session:
                    r = await session.run(
                        "MATCH (c:Case) WHERE c.docketNumber = $dn RETURN c LIMIT 1",
                        dn=staging.docketNumber,
                    )
                    if await r.single():
                        continue  # already in DB

                # Classify with Claude
                classification = await classify_incoming_case(
                    api_key,
                    staging.caption,
                    staging.courtName or "",
                    staging.dateFiled or "",
                    "",
                )

                if not classification.get("isAiLitigation", False):
                    continue

                confidence = classification.get("confidence", 0.0)
                case_id = f"cl-{staging.clSourceId}"

                async with driver.session() as session:
                    if confidence >= 0.85:
                        # Auto-add to main graph
                        await session.run(
                            """
                            MERGE (c:Case {id: $id})
                            SET c.caption = $caption,
                                c.courtName = $courtName,
                                c.dateFiled = $dateFiled,
                                c.docketNumber = $docketNumber,
                                c.source = 'courtlistener',
                                c.status = 'Active',
                                c.areaOfApplication = $areas,
                                c.causeOfAction = $causes,
                                c.autoClassified = true,
                                c.classificationConfidence = $conf,
                                c.absoluteUrl = $url,
                                c.ingestedAt = $ts
                        """,
                            id=case_id,
                            caption=staging.caption,
                            courtName=staging.courtName,
                            dateFiled=staging.dateFiled,
                            docketNumber=staging.docketNumber,
                            areas=classification.get("areaOfApplication", []),
                            causes=classification.get("causeOfAction", []),
                            conf=confidence,
                            url=staging.absoluteUrl,
                            ts=datetime.now(UTC).isoformat(),
                        )
                        cases_added += 1
                    else:
                        # Queue for human review
                        await session.run(
                            """
                            MERGE (c:Case {id: $id})
                            SET c.caption = $caption,
                                c.courtName = $courtName,
                                c.dateFiled = $dateFiled,
                                c.docketNumber = $docketNumber,
                                c.source = 'courtlistener',
                                c.status = 'pending_review',
                                c.autoClassified = true,
                                c.classificationConfidence = $conf,
                                c.absoluteUrl = $url,
                                c.ingestedAt = $ts
                        """,
                            id=case_id,
                            caption=staging.caption,
                            courtName=staging.courtName,
                            dateFiled=staging.dateFiled,
                            docketNumber=staging.docketNumber,
                            conf=confidence,
                            url=staging.absoluteUrl,
                            ts=datetime.now(UTC).isoformat(),
                        )
                        # Create review item
                        item_id = str(uuid.uuid4())
                        await session.run(
                            """
                            CREATE (r:ReviewItem {
                                id: $id, caseId: $caseId, type: 'classification',
                                payload: $payload, confidence: $conf,
                                status: 'pending', createdAt: $ts
                            })
                        """,
                            id=item_id,
                            caseId=case_id,
                            payload=json.dumps(classification),
                            conf=confidence,
                            ts=datetime.now(UTC).isoformat(),
                        )
                        cases_queued += 1

        # Log ingest run
        async with driver.session() as session:
            await session.run(
                """
                CREATE (ir:IngestRun {
                    timestamp: $ts,
                    casesFound: $found,
                    casesAdded: $added,
                    casesQueued: $queued
                })
            """,
                ts=datetime.now(UTC).isoformat(),
                found=cases_found,
                added=cases_added,
                queued=cases_queued,
            )

        logger.info(
            f"Ingest complete: found={cases_found}, added={cases_added}, queued={cases_queued}"
        )
        return {
            "casesFound": cases_found,
            "casesAdded": cases_added,
            "casesQueued": cases_queued,
        }
    finally:
        await cl.aclose()


def start_scheduler():
    """Start the APScheduler for weekly ingestion."""
    scheduler.add_job(
        ingest_new_cases,
        "interval",
        weeks=1,
        id="weekly_ingest",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("CourtListener ingest scheduler started (weekly interval).")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
