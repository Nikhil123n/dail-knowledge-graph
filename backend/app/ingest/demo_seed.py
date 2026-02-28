"""
demo_seed.py — Seeds Neo4j with synthetic demo data for hackathon demo.
Run with: python -m app.ingest.demo_seed (from backend/ directory)
"""
import asyncio
import os
from dotenv import load_dotenv
from app.services.neo4j_service import get_driver, init_schema

load_dotenv()

DEMO_CASES = [
    {
        "id": "demo-001",
        "caption": "Williams v. Clearview AI, Inc.",
        "briefDescription": "Class action alleging Clearview AI scraped biometric data without consent.",
        "areaOfApplication": ["Facial Recognition", "Biometric"],
        "causeOfAction": ["BIPA Violation", "Invasion of Privacy", "Unjust Enrichment"],
        "algorithmNames": ["Clearview Facial Recognition"],
        "organizations": "Williams (plaintiff), Clearview AI (defendant)",
        "jurisdictionFiled": "N.D. Illinois",
        "jurisdictionType": "Federal",
        "dateFiled": "2020-01-22",
        "status": "Active",
        "isClassAction": "Yes",
        "source": "dail",
    },
    {
        "id": "demo-002",
        "caption": "Doe v. Google LLC (Bard/Gemini)",
        "briefDescription": "Privacy class action over Google's use of personal data to train generative AI.",
        "areaOfApplication": ["Generative AI"],
        "causeOfAction": ["Privacy Violation", "Breach of Contract", "CCPA Violation"],
        "algorithmNames": ["Google Bard", "Gemini"],
        "organizations": "Doe (plaintiff), Google LLC (defendant), Alphabet Inc. (defendant)",
        "jurisdictionFiled": "N.D. California",
        "jurisdictionType": "Federal",
        "dateFiled": "2023-07-11",
        "status": "Active",
        "isClassAction": "Yes",
        "source": "dail",
    },
    {
        "id": "demo-003",
        "caption": "Andersen v. Stability AI Ltd.",
        "briefDescription": "Artists sue Stability AI, Midjourney, and DeviantArt alleging copyright infringement via generative AI image training.",
        "areaOfApplication": ["Generative AI", "Intellectual Property"],
        "causeOfAction": ["Copyright Infringement", "DMCA Violation", "Right of Publicity"],
        "algorithmNames": ["Stable Diffusion", "Midjourney"],
        "organizations": "Andersen (plaintiff), Stability AI (defendant), Midjourney (defendant), DeviantArt (defendant)",
        "jurisdictionFiled": "N.D. California",
        "jurisdictionType": "Federal",
        "dateFiled": "2023-01-13",
        "status": "Active",
        "isClassAction": "Yes",
        "source": "dail",
    },
    {
        "id": "demo-004",
        "caption": "Mobley v. Tesla, Inc.",
        "briefDescription": "Wrongful death suit alleging Tesla Autopilot caused fatal crash.",
        "areaOfApplication": ["Autonomous Vehicles"],
        "causeOfAction": ["Products Liability", "Negligence", "Wrongful Death"],
        "algorithmNames": ["Tesla Autopilot", "Tesla FSD"],
        "organizations": "Mobley (plaintiff), Tesla Inc. (defendant)",
        "jurisdictionFiled": "C.D. California",
        "jurisdictionType": "Federal",
        "dateFiled": "2022-05-04",
        "status": "Inactive",
        "isClassAction": "No",
        "source": "dail",
    },
    {
        "id": "demo-005",
        "caption": "OpenAI Privacy Class Action (Doe v. OpenAI)",
        "briefDescription": "Privacy class action alleging OpenAI scraped personal data without consent to train ChatGPT.",
        "areaOfApplication": ["Generative AI"],
        "causeOfAction": ["Privacy Violation", "ECPA Violation", "Negligence"],
        "algorithmNames": ["ChatGPT", "GPT-4"],
        "organizations": "Doe (plaintiff), OpenAI Inc. (defendant), Microsoft Corporation (defendant)",
        "jurisdictionFiled": "N.D. California",
        "jurisdictionType": "Federal",
        "dateFiled": "2023-06-28",
        "status": "Active",
        "isClassAction": "Yes",
        "source": "dail",
    },
    {
        "id": "demo-006",
        "caption": "Ridgeway v. Workday, Inc.",
        "briefDescription": "Discrimination claim alleging Workday's AI screening tools discriminate against protected job applicants.",
        "areaOfApplication": ["Employment"],
        "causeOfAction": ["Title VII Discrimination", "ADA Violation", "ADEA Violation"],
        "algorithmNames": ["Workday AI Recruiting"],
        "organizations": "Ridgeway (plaintiff), Workday Inc. (defendant)",
        "jurisdictionFiled": "N.D. California",
        "jurisdictionType": "Federal",
        "dateFiled": "2023-02-28",
        "status": "Active",
        "isClassAction": "Yes",
        "source": "dail",
    },
    {
        "id": "demo-007",
        "caption": "Thaler v. Vidal (DABUS Patent)",
        "briefDescription": "Federal Circuit appeal on whether an AI system can be named as a patent inventor.",
        "areaOfApplication": ["Intellectual Property"],
        "causeOfAction": ["Patent Act Challenge", "Administrative Law"],
        "algorithmNames": ["DABUS"],
        "organizations": "Thaler (plaintiff), USPTO (defendant)",
        "jurisdictionFiled": "E.D. Virginia",
        "jurisdictionType": "Federal",
        "dateFiled": "2020-11-03",
        "status": "Inactive",
        "isClassAction": "No",
        "source": "dail",
    },
    {
        "id": "demo-008",
        "caption": "Healthcare AI Bias Complaint (HHS OCR)",
        "briefDescription": "HHS OCR complaint alleging hospital's predictive algorithm discriminates against Black patients.",
        "areaOfApplication": ["Healthcare"],
        "causeOfAction": ["Section 1557 ACA Violation", "Civil Rights Violation"],
        "algorithmNames": ["Optum Health Risk Algorithm"],
        "organizations": "Hospital System (defendant), HHS OCR (regulator)",
        "jurisdictionFiled": "HHS Office for Civil Rights",
        "jurisdictionType": "Administrative",
        "dateFiled": "2021-08-10",
        "status": "Inactive",
        "isClassAction": "No",
        "source": "dail",
    },
]

DEMO_ORGS = [
    {"canonicalName": "Clearview AI, Inc.", "name": "Clearview AI"},
    {"canonicalName": "Google LLC", "name": "Google"},
    {"canonicalName": "Alphabet Inc.", "name": "Alphabet"},
    {"canonicalName": "Stability AI Ltd.", "name": "Stability AI"},
    {"canonicalName": "Midjourney, Inc.", "name": "Midjourney"},
    {"canonicalName": "DeviantArt, Inc.", "name": "DeviantArt"},
    {"canonicalName": "Tesla, Inc.", "name": "Tesla"},
    {"canonicalName": "OpenAI, Inc.", "name": "OpenAI"},
    {"canonicalName": "Microsoft Corporation", "name": "Microsoft"},
    {"canonicalName": "Workday, Inc.", "name": "Workday"},
    {"canonicalName": "USPTO", "name": "USPTO"},
]

DEMO_RELATIONSHIPS = [
    # (case_id, org_canonical, roles, confidence)
    ("demo-001", "Clearview AI, Inc.", ["defendant"], 0.97),
    ("demo-002", "Google LLC", ["defendant"], 0.97),
    ("demo-002", "Alphabet Inc.", ["defendant"], 0.92),
    ("demo-003", "Stability AI Ltd.", ["defendant"], 0.97),
    ("demo-003", "Midjourney, Inc.", ["defendant"], 0.95),
    ("demo-003", "DeviantArt, Inc.", ["defendant"], 0.90),
    ("demo-004", "Tesla, Inc.", ["defendant"], 0.97),
    ("demo-005", "OpenAI, Inc.", ["defendant"], 0.97),
    ("demo-005", "Microsoft Corporation", ["defendant"], 0.93),
    ("demo-006", "Workday, Inc.", ["defendant"], 0.97),
    ("demo-007", "USPTO", ["defendant"], 0.97),
]

DEMO_AI_SYSTEMS = [
    ("demo-001", "Clearview Facial Recognition", "biometric", 0.97),
    ("demo-002", "Google Gemini", "LLM", 0.95),
    ("demo-003", "Stable Diffusion", "LLM", 0.97),
    ("demo-003", "Midjourney", "LLM", 0.95),
    ("demo-004", "Tesla Autopilot", "autonomous", 0.98),
    ("demo-005", "ChatGPT", "LLM", 0.98),
    ("demo-006", "Workday AI Recruiting", "classifier", 0.93),
    ("demo-007", "DABUS", "other", 0.90),
    ("demo-008", "Optum Health Risk Algorithm", "classifier", 0.92),
]


async def seed_demo(driver):
    print("Seeding demo cases...")
    async with driver.session() as session:
        for case in DEMO_CASES:
            await session.run(
                """
                MERGE (c:Case {id: $id})
                SET c += {
                    caption: $caption,
                    briefDescription: $briefDescription,
                    areaOfApplication: $areaOfApplication,
                    causeOfAction: $causeOfAction,
                    algorithmNames: $algorithmNames,
                    organizations: $organizations,
                    jurisdictionFiled: $jurisdictionFiled,
                    jurisdictionType: $jurisdictionType,
                    dateFiled: $dateFiled,
                    status: $status,
                    isClassAction: $isClassAction,
                    source: $source
                }
            """,
                **case,
            )
    print(f"  {len(DEMO_CASES)} demo cases seeded.")

    print("Seeding demo organizations...")
    async with driver.session() as session:
        for org in DEMO_ORGS:
            await session.run(
                """
                MERGE (o:Organization {canonicalName: $canonicalName})
                SET o.name = $name
            """,
                **org,
            )
    print(f"  {len(DEMO_ORGS)} demo organizations seeded.")

    print("Seeding defendant relationships...")
    async with driver.session() as session:
        for case_id, org_canonical, roles, confidence in DEMO_RELATIONSHIPS:
            await session.run(
                """
                MATCH (c:Case {id: $caseId})
                MATCH (o:Organization {canonicalName: $orgName})
                MERGE (c)-[r:NAMED_DEFENDANT]->(o)
                SET r.roles = $roles, r.confidence = $conf,
                    r.extractedBy = 'demo', r.reviewedByHuman = true
            """,
                caseId=case_id,
                orgName=org_canonical,
                roles=roles,
                conf=confidence,
            )
    print(f"  {len(DEMO_RELATIONSHIPS)} defendant relationships seeded.")

    print("Seeding AI systems...")
    async with driver.session() as session:
        for case_id, name, category, confidence in DEMO_AI_SYSTEMS:
            await session.run(
                """
                MERGE (s:AISystem {name: $name})
                SET s.category = $category
                WITH s
                MATCH (c:Case {id: $caseId})
                MERGE (c)-[r:INVOLVES_SYSTEM]->(s)
                SET r.confidence = $conf, r.reviewedByHuman = true
            """,
                caseId=case_id,
                name=name,
                category=category,
                conf=confidence,
            )
    print(f"  {len(DEMO_AI_SYSTEMS)} AI system relationships seeded.")

    print("Seeding LegalTheory nodes from case data...")
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

    print("Seeding Court nodes from case data...")
    async with driver.session() as session:
        await session.run("""
            MATCH (c:Case)
            WHERE c.jurisdictionFiled IS NOT NULL AND c.jurisdictionFiled <> ''
            MERGE (ct:Court {name: c.jurisdictionFiled})
            SET ct.jurisdictionType = c.jurisdictionType
            MERGE (c)-[:FILED_IN]->(ct)
        """)

    print("\nDemo seed complete!")


async def main():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "dail_password")
    driver = await get_driver(uri, user, password)
    await init_schema(driver)
    await seed_demo(driver)
    await driver.close()


if __name__ == "__main__":
    asyncio.run(main())
