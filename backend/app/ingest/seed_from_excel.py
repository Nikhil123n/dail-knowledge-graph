import asyncio
import pandas as pd
import os
from dotenv import load_dotenv
from app.services.neo4j_service import get_driver, init_schema

load_dotenv()

# Resolve data/ relative to project root: backend/app/ingest/ -> up 3 -> dail-knowledge-graph/data/
DATA_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "data")
)


def clean_val(val) -> str:
    try:
        if pd.isna(val):
            return ""
    except Exception:
        pass
    return str(val).strip()


def clean_list(val) -> list:
    """Parse comma-separated values into a clean Python list."""
    try:
        if pd.isna(val):
            return []
    except Exception:
        pass
    s = str(val).strip()
    if s.startswith("'") or s.startswith('"'):
        parts = [p.strip().strip("'\"") for p in s.split(",")]
    else:
        parts = [p.strip() for p in s.split(",")]
    return [p for p in parts if p and p.lower() not in ("nan", "none", "")]


def clean_date(val) -> str | None:
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    try:
        return pd.to_datetime(val).strftime("%Y-%m-%d")
    except Exception:
        return None


async def seed_cases(driver):
    df = pd.read_csv(f"{DATA_DIR}/dail_cases.csv")
    print(f"Seeding {len(df)} cases...")
    batch_size = 50
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i : i + batch_size]
        records = []
        for _, row in batch.iterrows():
            records.append(
                {
                    "id": clean_val(row.get("Case_snug")),
                    "recordNumber": clean_val(row.get("Record_Number")),
                    "caption": clean_val(row.get("Caption")),
                    "briefDescription": clean_val(row.get("Brief_Description")),
                    "areaOfApplication": clean_list(row.get("Area_of_Application_Text")),
                    "causeOfAction": clean_list(row.get("Cause_of_Action_Text")),
                    "issues": clean_list(row.get("Issue_Text")),
                    "algorithmNames": clean_list(row.get("Name_of_Algorithm_Text")),
                    "organizations": clean_val(row.get("Organizations_involved")),
                    "jurisdictionFiled": clean_val(row.get("Jurisdiction_Filed")),
                    "dateFiled": clean_date(row.get("Date_Action_Filed")),
                    "currentJurisdiction": clean_val(row.get("Current_Jurisdiction")),
                    "jurisdictionType": clean_val(row.get("Jurisdiction_Type_Text")),
                    "status": clean_val(row.get("Status_Disposition")),
                    "summarySignificance": clean_val(row.get("Summary_of_Significance")),
                    "summaryFacts": clean_val(row.get("Summary_Facts_Activity_to_Date")),
                    "mostRecentActivity": clean_val(row.get("Most_Recent_Activity")),
                    "isClassAction": clean_val(row.get("Class_Action")),
                    "dateAdded": clean_date(row.get("Date_Added")),
                    "source": "dail",
                }
            )
        async with driver.session() as session:
            await session.run(
                """
                UNWIND $records AS rec
                MERGE (c:Case {id: rec.id})
                SET c += {
                    recordNumber: rec.recordNumber,
                    caption: rec.caption,
                    briefDescription: rec.briefDescription,
                    areaOfApplication: rec.areaOfApplication,
                    causeOfAction: rec.causeOfAction,
                    issues: rec.issues,
                    algorithmNames: rec.algorithmNames,
                    organizations: rec.organizations,
                    jurisdictionFiled: rec.jurisdictionFiled,
                    dateFiled: rec.dateFiled,
                    currentJurisdiction: rec.currentJurisdiction,
                    jurisdictionType: rec.jurisdictionType,
                    status: rec.status,
                    summarySignificance: rec.summarySignificance,
                    summaryFacts: rec.summaryFacts,
                    mostRecentActivity: rec.mostRecentActivity,
                    isClassAction: rec.isClassAction,
                    dateAdded: rec.dateAdded,
                    source: rec.source
                }
            """,
                records=records,
            )
        print(f"  Seeded cases {i + 1} to {min(i + batch_size, len(df))}")
    print("Cases seeded.")


async def seed_dockets(driver):
    try:
        df = pd.read_csv(f"{DATA_DIR}/dail_dockets.csv")
    except FileNotFoundError:
        print("No dail_dockets.csv found, skipping.")
        return

    # Build lookup: numeric case id -> Case_snug (slug is the graph node id)
    cases_df = pd.read_csv(f"{DATA_DIR}/dail_cases.csv")
    id_to_slug = dict(zip(cases_df["id"].astype(int), cases_df["Case_snug"]))

    print(f"Seeding {len(df)} dockets...")
    linked = 0
    orphaned = 0
    async with driver.session() as session:
        for _, row in df.iterrows():
            try:
                case_num = int(float(clean_val(row.get("Case_Number"))))
            except (ValueError, TypeError):
                continue
            slug = id_to_slug.get(case_num)
            if not slug:
                orphaned += 1
                continue
            await session.run(
                """
                MATCH (c:Case {id: $caseId})
                MERGE (d:Docket {id: $id})
                SET d.court = $court, d.number = $number, d.link = $link
                MERGE (c)-[:HAS_DOCKET]->(d)
            """,
                caseId=slug,
                id=clean_val(row.get("id")),
                court=clean_val(row.get("court")),
                number=clean_val(row.get("number")),
                link=clean_val(row.get("link")),
            )
            linked += 1
    print(f"  Dockets: {linked} linked, {orphaned} orphaned")
    print("Dockets seeded.")


async def seed_documents(driver):
    try:
        df = pd.read_csv(f"{DATA_DIR}/dail_documents.csv")
    except FileNotFoundError:
        print("No dail_documents.csv found, skipping.")
        return

    # Build lookup: numeric case id -> Case_snug
    cases_df = pd.read_csv(f"{DATA_DIR}/dail_cases.csv")
    id_to_slug = dict(zip(cases_df["id"].astype(int), cases_df["Case_snug"]))

    print(f"Seeding {len(df)} documents...")
    linked = 0
    orphaned = 0
    async with driver.session() as session:
        for _, row in df.iterrows():
            try:
                case_num = int(float(clean_val(row.get("Case_Number"))))
            except (ValueError, TypeError):
                continue
            slug = id_to_slug.get(case_num)
            if not slug:
                orphaned += 1
                continue
            await session.run(
                """
                MATCH (c:Case {id: $caseId})
                MERGE (doc:Document {id: $id})
                SET doc.court = $court, doc.date = $date, doc.link = $link,
                    doc.type = $docType, doc.citeOrReference = $cite
                MERGE (c)-[:HAS_DOCUMENT]->(doc)
            """,
                caseId=slug,
                id=clean_val(row.get("id")),
                court=clean_val(row.get("court")),
                date=clean_val(row.get("date")),
                link=clean_val(row.get("link")),
                docType=clean_val(row.get("document")),
                cite=clean_val(row.get("cite_or_reference")),
            )
            linked += 1
    print(f"  Documents: {linked} linked, {orphaned} orphaned")
    print("Documents seeded.")


async def seed_legal_theories(driver):
    print("Seeding LegalTheory nodes...")
    async with driver.session() as session:
        await session.run("""
            MATCH (c:Case) WHERE size(c.causeOfAction) > 0
            UNWIND c.causeOfAction AS theory
            WITH trim(theory) AS t WHERE t <> ''
            MERGE (lt:LegalTheory {name: t})
            WITH lt, t
            MATCH (c:Case) WHERE t IN c.causeOfAction
            MERGE (c)-[:ASSERTS_CLAIM]->(lt)
        """)
    print("LegalTheory nodes and relationships seeded.")


async def seed_courts(driver):
    print("Seeding Court nodes...")
    async with driver.session() as session:
        await session.run("""
            MATCH (c:Case) WHERE c.jurisdictionFiled IS NOT NULL AND c.jurisdictionFiled <> ''
            WITH c, c.jurisdictionFiled AS courtName, c.jurisdictionType AS jType
            MERGE (ct:Court {name: courtName})
            SET ct.jurisdictionType = jType
            MERGE (c)-[:FILED_IN]->(ct)
        """)
    print("Court nodes and relationships seeded.")


async def seed_secondary_sources(driver):
    """Seed (:SecondarySource) nodes and link to cases via HAS_SECONDARY_SOURCE."""
    try:
        df = pd.read_csv(f"{DATA_DIR}/dail_secondary_sources.csv")
    except FileNotFoundError:
        print("No dail_secondary_sources.csv found, skipping.")
        return

    # Build lookup: numeric case id -> Case_snug (slug used as graph id)
    cases_df = pd.read_csv(f"{DATA_DIR}/dail_cases.csv")
    id_to_slug = dict(zip(cases_df["id"].astype(int), cases_df["Case_snug"]))

    print(f"Seeding {len(df)} secondary sources...")
    linked = 0
    orphaned = 0

    async with driver.session() as session:
        for _, row in df.iterrows():
            case_num = int(row.get("Case_Number", 0))
            slug = id_to_slug.get(case_num)
            if not slug:
                orphaned += 1
                continue
            link = str(row.get("Secondary_Source_Link", "")).strip()
            title = str(row.get("Secondary_Source_Title", "")).strip()
            if not link or link in ("nan", ""):
                continue
            await session.run(
                """
                MATCH (c:Case {id: $slug})
                MERGE (s:SecondarySource {link: $link})
                SET s.title = $title, s.sourceId = $srcId
                MERGE (c)-[:HAS_SECONDARY_SOURCE]->(s)
            """,
                slug=slug,
                link=link,
                title=title,
                srcId=int(row.get("id", 0)),
            )
            linked += 1

    print(f"  Secondary sources: {linked} linked, {orphaned} orphaned (case not found)")


async def main():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "dail_password")
    driver = await get_driver(uri, user, password)
    await init_schema(driver)
    await seed_cases(driver)
    await seed_dockets(driver)
    await seed_documents(driver)
    await seed_secondary_sources(driver)
    await seed_legal_theories(driver)
    await seed_courts(driver)
    await driver.close()
    print("\nAll seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
