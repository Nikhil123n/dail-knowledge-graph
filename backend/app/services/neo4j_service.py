from neo4j import AsyncGraphDatabase, AsyncDriver
from typing import Optional
import logging
import json

logger = logging.getLogger(__name__)

_driver: Optional[AsyncDriver] = None


async def get_driver(uri: str, user: str, password: str) -> AsyncDriver:
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
    return _driver


async def close_driver():
    global _driver
    if _driver:
        await _driver.close()
        _driver = None


async def init_schema(driver: AsyncDriver):
    """Create all constraints and indexes. Safe to run multiple times."""
    constraints = [
        "CREATE CONSTRAINT case_id IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE",
        "CREATE CONSTRAINT org_canonical IF NOT EXISTS FOR (o:Organization) REQUIRE o.canonicalName IS UNIQUE",
        "CREATE CONSTRAINT ai_system_name IF NOT EXISTS FOR (s:AISystem) REQUIRE s.name IS UNIQUE",
        "CREATE CONSTRAINT legal_theory_name IF NOT EXISTS FOR (t:LegalTheory) REQUIRE t.name IS UNIQUE",
        "CREATE CONSTRAINT court_name IF NOT EXISTS FOR (ct:Court) REQUIRE ct.name IS UNIQUE",
        "CREATE CONSTRAINT review_item_id IF NOT EXISTS FOR (r:ReviewItem) REQUIRE r.id IS UNIQUE",
        "CREATE INDEX case_status IF NOT EXISTS FOR (c:Case) ON (c.status)",
        "CREATE INDEX case_date IF NOT EXISTS FOR (c:Case) ON (c.dateFiled)",
        "CREATE INDEX case_source IF NOT EXISTS FOR (c:Case) ON (c.source)",
        "CREATE INDEX org_name IF NOT EXISTS FOR (o:Organization) ON (o.name)",
        "CREATE CONSTRAINT secondary_source_link IF NOT EXISTS FOR (s:SecondarySource) REQUIRE s.link IS UNIQUE",
    ]
    async with driver.session() as session:
        for stmt in constraints:
            try:
                await session.run(stmt)
                logger.info(f"Schema: {stmt[:60]}...")
            except Exception as e:
                logger.warning(f"Schema stmt skipped (may already exist): {e}")
    logger.info("Neo4j schema initialization complete.")


async def get_graph_overview(driver: AsyncDriver) -> dict:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (c:Case) WITH count(c) AS cases
            MATCH (o:Organization) WITH cases, count(o) AS orgs
            MATCH (s:AISystem) WITH cases, orgs, count(s) AS systems
            MATCH (t:LegalTheory) WITH cases, orgs, systems, count(t) AS theories
            MATCH (ct:Court) WITH cases, orgs, systems, theories, count(ct) AS courts
            MATCH ()-[r]->() WITH cases, orgs, systems, theories, courts, count(r) AS rels
            RETURN cases, orgs, systems, theories, courts, rels
        """)
        record = await result.single()
        if record:
            return {
                "cases": record["cases"],
                "organizations": record["orgs"],
                "aiSystems": record["systems"],
                "legalTheories": record["theories"],
                "courts": record["courts"],
                "relationships": record["rels"]
            }
        return {"cases": 0, "organizations": 0, "aiSystems": 0, "legalTheories": 0, "courts": 0, "relationships": 0}


async def get_top_defendants(driver: AsyncDriver, limit: int = 20) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (o:Organization)<-[:NAMED_DEFENDANT]-(c:Case)
            WITH o, count(c) AS total,
                 sum(CASE WHEN c.status = 'Active' THEN 1 ELSE 0 END) AS active,
                 sum(CASE WHEN c.status = 'Inactive' THEN 1 ELSE 0 END) AS inactive
            ORDER BY total DESC LIMIT $limit
            RETURN o.canonicalName AS canonicalName, total AS caseCount,
                   active AS activeCount, inactive AS inactiveCount
        """, limit=limit)
        return [dict(r) async for r in result]


async def get_defendant_cases(driver: AsyncDriver, org_name: str) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (o:Organization {canonicalName: $name})<-[:NAMED_DEFENDANT]-(c:Case)
            OPTIONAL MATCH (c)-[:ASSERTS_CLAIM]->(t:LegalTheory)
            OPTIONAL MATCH (c)-[:INVOLVES_SYSTEM]->(s:AISystem)
            RETURN c.id AS id, c.caption AS caption, c.status AS status,
                   c.dateFiled AS dateFiled, c.jurisdictionType AS jurisdictionType,
                   collect(DISTINCT t.name) AS theories,
                   collect(DISTINCT s.name) AS aiSystems
        """, name=org_name)
        return [dict(r) async for r in result]


async def get_top_ai_systems(driver: AsyncDriver, limit: int = 15) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (s:AISystem)<-[:INVOLVES_SYSTEM]-(c:Case)
            WITH s, count(c) AS caseCount
            ORDER BY caseCount DESC LIMIT $limit
            RETURN s.name AS name, s.category AS category, caseCount
        """, limit=limit)
        return [dict(r) async for r in result]


async def get_cases_by_theory(driver: AsyncDriver, theory_name: str) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (t:LegalTheory {name: $name})<-[:ASSERTS_CLAIM]-(c:Case)
            RETURN c.id AS id, c.caption AS caption, c.status AS status,
                   c.dateFiled AS dateFiled, c.jurisdictionType AS jurisdictionType
        """, name=theory_name)
        return [dict(r) async for r in result]


async def get_case_by_id(driver: AsyncDriver, case_id: str) -> Optional[dict]:
    async with driver.session() as session:
        result = await session.run("MATCH (c:Case {id: $id}) RETURN c", id=case_id)
        record = await result.single()
        return dict(record["c"]) if record else None


async def get_case_neighbors(driver: AsyncDriver, case_id: str) -> dict:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (c:Case {id: $id})
            OPTIONAL MATCH (c)-[r1:NAMED_DEFENDANT]->(o:Organization)
            OPTIONAL MATCH (c)-[r2:INVOLVES_SYSTEM]->(s:AISystem)
            OPTIONAL MATCH (c)-[:ASSERTS_CLAIM]->(t:LegalTheory)
            OPTIONAL MATCH (c)-[:FILED_IN]->(ct:Court)
            RETURN c,
                   collect(DISTINCT {name: o.canonicalName, confidence: r1.confidence, roles: r1.roles}) AS orgs,
                   collect(DISTINCT {name: s.name, category: s.category, confidence: r2.confidence}) AS systems,
                   collect(DISTINCT t.name) AS theories,
                   collect(DISTINCT ct.name) AS courts
        """, id=case_id)
        record = await result.single()
        if not record:
            return {}
        return {
            "case": dict(record["c"]),
            "organizations": [o for o in record["orgs"] if o["name"]],
            "aiSystems": [s for s in record["systems"] if s["name"]],
            "legalTheories": record["theories"],
            "courts": record["courts"]
        }


async def get_similar_cases(driver: AsyncDriver, case_id: str) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (target:Case {id: $id})
            MATCH (target)-[:NAMED_DEFENDANT]->(o:Organization)<-[:NAMED_DEFENDANT]-(other:Case)
            WHERE other.id <> $id
            WITH other, count(o) AS sharedOrgs
            OPTIONAL MATCH (target)-[:ASSERTS_CLAIM]->(t:LegalTheory)<-[:ASSERTS_CLAIM]-(other)
            WITH other, sharedOrgs, count(t) AS sharedTheories
            WITH other, sharedOrgs + sharedTheories AS totalOverlap
            WHERE totalOverlap >= 2
            ORDER BY totalOverlap DESC LIMIT 10
            RETURN other.id AS id, other.caption AS caption,
                   other.status AS status, totalOverlap
        """, id=case_id)
        return [dict(r) async for r in result]


async def get_cases_list(
    driver: AsyncDriver,
    status: Optional[str],
    jurisdiction_type: Optional[str],
    area: Optional[str],
    limit: int = 50,
    skip: int = 0
) -> list:
    where_clauses = []
    params: dict = {"limit": limit, "skip": skip}
    if status:
        where_clauses.append("c.status = $status")
        params["status"] = status
    if jurisdiction_type:
        where_clauses.append("c.jurisdictionType = $jurisdictionType")
        params["jurisdictionType"] = jurisdiction_type
    if area:
        where_clauses.append("$area IN c.areaOfApplication")
        params["area"] = area
    where = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
    async with driver.session() as session:
        result = await session.run(f"""
            MATCH (c:Case) {where}
            RETURN c.id AS id, c.caption AS caption, c.status AS status,
                   c.dateFiled AS dateFiled, c.jurisdictionType AS jurisdictionType,
                   c.areaOfApplication AS areaOfApplication
            ORDER BY c.dateFiled DESC SKIP $skip LIMIT $limit
        """, **params)
        return [dict(r) async for r in result]


async def get_review_queue(
    driver: AsyncDriver,
    item_type: Optional[str] = None,
    limit: int = 20
) -> list:
    where = "WHERE r.type = $type" if item_type else ""
    params: dict = {"limit": limit}
    if item_type:
        params["type"] = item_type
    async with driver.session() as session:
        result = await session.run(f"""
            MATCH (r:ReviewItem {{status: 'pending'}})
            {where}
            OPTIONAL MATCH (c:Case {{id: r.caseId}})
            RETURN r.id AS id, r.caseId AS caseId, c.caption AS caseCaption,
                   r.type AS type, r.payload AS payload, r.confidence AS confidence,
                   r.status AS status, r.createdAt AS createdAt, r.rawText AS rawText
            ORDER BY r.confidence ASC LIMIT $limit
        """, **params)
        items = []
        async for record in result:
            item = dict(record)
            if item.get("payload") and isinstance(item["payload"], str):
                try:
                    item["payload"] = json.loads(item["payload"])
                except Exception:
                    pass
            items.append(item)
        return items


async def get_review_stats(driver: AsyncDriver) -> dict:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (r:ReviewItem)
            RETURN r.status AS status, count(r) AS cnt, avg(r.confidence) AS avgConf
        """)
        stats: dict = {"pending": 0, "approved": 0, "rejected": 0, "avgConfidence": 0.0}
        total_conf = 0.0
        total_items = 0
        async for record in result:
            s, cnt, avg_c = record["status"], record["cnt"], record["avgConf"] or 0
            if s in stats:
                stats[s] = cnt
            total_conf += avg_c * cnt
            total_items += cnt
        if total_items > 0:
            stats["avgConfidence"] = round(total_conf / total_items, 3)
        return stats


async def approve_review_item(driver: AsyncDriver, item_id: str) -> bool:
    async with driver.session() as session:
        await session.run("""
            MATCH (r:ReviewItem {id: $id})
            SET r.status = 'approved', r.reviewedAt = datetime()
            WITH r
            MATCH ()-[rel {reviewItemId: $id}]-()
            SET rel.reviewedByHuman = true
        """, id=item_id)
        return True


async def reject_review_item(driver: AsyncDriver, item_id: str, correction: dict) -> bool:
    async with driver.session() as session:
        await session.run("""
            MATCH (r:ReviewItem {id: $id})
            SET r.status = 'rejected', r.correction = $correction, r.reviewedAt = datetime()
            CREATE (:CorrectionLog {
                reviewItemId: $id,
                correction: $correction,
                loggedAt: datetime()
            })
        """, id=item_id, correction=json.dumps(correction))
        return True


async def detect_waves_cypher(
    driver: AsyncDriver,
    window_days: int = 60,
    threshold: int = 3
) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (c:Case)-[:NAMED_DEFENDANT]->(org:Organization)
            WHERE c.dateFiled IS NOT NULL
              AND date(c.dateFiled) >= date() - duration({days: $days})
            WITH org, collect(c.id) AS caseIds, count(c) AS n
            WHERE n >= $threshold
            UNWIND caseIds AS cid
            MATCH (c2:Case {id: cid})
            OPTIONAL MATCH (c2)-[:ASSERTS_CLAIM]->(t:LegalTheory)
            WITH org, n, caseIds, collect(DISTINCT t.name) AS theories,
                 collect(DISTINCT c2.jurisdictionType) AS jurisdictions
            RETURN org.canonicalName AS defendant, n AS caseCount,
                   theories, jurisdictions
            ORDER BY n DESC
        """, days=window_days, threshold=threshold)
        return [dict(r) async for r in result]


async def get_ingest_history(driver: AsyncDriver, limit: int = 10) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (ir:IngestRun)
            RETURN ir.timestamp AS timestamp, ir.casesFound AS casesFound,
                   ir.casesAdded AS casesAdded, ir.casesQueued AS casesQueued
            ORDER BY ir.timestamp DESC LIMIT $limit
        """, limit=limit)
        return [dict(r) async for r in result]


async def get_staged_cases(driver: AsyncDriver) -> list:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (c:Case {source: 'courtlistener', status: 'pending_review'})
            RETURN c.id AS id, c.caption AS caption, c.courtName AS courtName,
                   c.dateFiled AS dateFiled,
                   c.classificationConfidence AS confidence
            ORDER BY c.dateFiled DESC
        """)
        return [dict(r) async for r in result]


async def run_raw_cypher(driver: AsyncDriver, cypher: str, params: dict = {}) -> list:
    """Execute arbitrary read-only Cypher. Used by the search endpoint."""
    async with driver.session() as session:
        result = await session.run(cypher, **params)
        return [dict(r) async for r in result]


async def get_node_counts(driver: AsyncDriver) -> dict:
    """Extended overview including documents and secondary sources."""
    async with driver.session() as session:
        result = await session.run("""
            MATCH (c:Case) WITH count(c) AS cases
            MATCH (o:Organization) WITH cases, count(o) AS orgs
            MATCH (s:AISystem) WITH cases, orgs, count(s) AS systems
            MATCH (t:LegalTheory) WITH cases, orgs, systems, count(t) AS theories
            MATCH (ct:Court) WITH cases, orgs, systems, theories, count(ct) AS courts
            MATCH (d:Document) WITH cases, orgs, systems, theories, courts, count(d) AS docs
            MATCH (ss:SecondarySource) WITH cases, orgs, systems, theories, courts, docs, count(ss) AS secondary
            MATCH ()-[r]->() WITH cases, orgs, systems, theories, courts, docs, secondary, count(r) AS rels
            RETURN cases, orgs, systems, theories, courts, docs, secondary, rels
        """)
        record = await result.single()
        if record:
            return {
                "cases": record["cases"],
                "organizations": record["orgs"],
                "aiSystems": record["systems"],
                "legalTheories": record["theories"],
                "courts": record["courts"],
                "documents": record["docs"],
                "secondarySources": record["secondary"],
                "relationships": record["rels"],
            }
        return {
            "cases": 0, "organizations": 0, "aiSystems": 0, "legalTheories": 0,
            "courts": 0, "documents": 0, "secondarySources": 0, "relationships": 0,
        }


async def get_secondary_sources(driver: AsyncDriver, case_id: str) -> list:
    """Return secondary sources (news, blogs) linked to a case."""
    async with driver.session() as session:
        result = await session.run("""
            MATCH (c:Case {id: $id})-[:HAS_SECONDARY_SOURCE]->(s:SecondarySource)
            RETURN s.title AS title, s.link AS link
            ORDER BY s.title
        """, id=case_id)
        return [dict(r) async for r in result]
