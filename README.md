# DAIL Living Case Graph

A Neo4j knowledge graph for the **Database of AI Litigation (DAIL)** at GWU Law.
Transforms 375+ AI litigation cases from a flat spreadsheet into a living, queryable graph with semantic relationships, AI-powered entity extraction, natural language search, and a real-time litigation wave detector.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Graph Schema](#graph-schema)
5. [Prerequisites](#prerequisites)
6. [Environment Setup](#environment-setup)
7. [Running the Project](#running-the-project)
8. [Data Seeding](#data-seeding)
9. [API Reference](#api-reference)
10. [Frontend Pages](#frontend-pages)
11. [Production (Docker)](#production-docker)

---

## Features

| Module | What it does |
|--------|-------------|
| **Graph Explorer** | Interactive D3.js force-graph — explore defendant networks, click nodes to drill into case neighborhoods |
| **Research Navigator** | Natural language → Cypher → plain-English narrative powered by Gemini |
| **Wave Detector** | Detects litigation clusters (≥3 cases against same defendant within a configurable window — default 90 days) with AI-generated briefing notes |
| **Review Queue** | Human-in-the-loop review for low-confidence AI extractions (0.70–0.84 threshold) |
| **Live Ingest** | Weekly APScheduler job polls CourtListener API for new AI cases and classifies them automatically |
| **Secondary Sources** | Links cases to academic papers, news articles, and other secondary materials |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React 18 + Vite + Tailwind CSS v4 + D3.js (port 5173)     │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP /api/v1/*
┌───────────────────────▼─────────────────────────────────────┐
│                   FastAPI Backend (port 8000)                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  /cases      │  │  /graph      │  │  /search          │  │
│  │  /review     │  │  /ingest     │  │  NL→Cypher        │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│                                                             │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │  neo4j_service.py    │   │  claude_service.py        │   │
│  │  (all Cypher)        │   │  (Gemini 2.5 Flash API)   │   │
│  └──────────────────────┘   └──────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │  CourtListener       │   │  APScheduler             │   │
│  │  (live ingestion)    │   │  (weekly cron)           │   │
│  └──────────────────────┘   └──────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ Bolt protocol
┌───────────────────────▼─────────────────────────────────────┐
│              Neo4j 5 Community (port 7474 / 7687)           │
│              Data persisted in Docker volume: neo4j_data    │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
dail-knowledge-graph/
├── docker-compose.yml          # Orchestrates neo4j + backend + frontend
├── .env.example                # Environment variable template
├── data/                       # Excel/CSV source files (not committed)
│   ├── DAIL_Cases.xlsx
│   ├── DAIL_Dockets.xlsx
│   ├── DAIL_Documents.xlsx
│   └── DAIL_Secondary_Sources.xlsx
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                     # FastAPI app, lifespan, CORS, router registration
│       ├── api/
│       │   ├── dependencies.py         # Settings (pydantic-settings), get_neo4j()
│       │   └── routes/
│       │       ├── cases.py            # GET /cases/, /cases/{id}, /neighbors, /similar
│       │       ├── graph.py            # GET /graph/overview, /defendants, /ai-systems
│       │       ├── search.py           # POST /search/ (NL → Cypher → narrative)
│       │       ├── review.py           # GET /review/queue; POST /review/{id}/approve|reject
│       │       └── ingest.py           # POST /ingest/trigger; GET /waves, /history
│       ├── models/
│       │   ├── graph_models.py         # Pydantic models: Case, SearchRequest/Response, WaveSignal
│       │   └── review_models.py        # ReviewItem, ReviewAction models
│       ├── services/
│       │   ├── neo4j_service.py        # All Cypher queries + schema init
│       │   ├── claude_service.py       # Gemini API: extract_entities, classify, NL→Cypher, narrate
│       │   ├── wave_detector.py        # detect_waves() orchestrator
│       │   └── courtlistener.py        # CourtListener REST client
│       └── ingest/
│           ├── convert_xlsx.py         # Step 1: Excel → clean CSV (run once)
│           ├── seed_from_excel.py      # Step 2: CSV → Neo4j (cases, dockets, docs, secondary sources)
│           ├── export_sql.py           # Step 3 (alt): CSV → SQLite + schema.sql + data.sql
│           ├── demo_seed.py            # Optional: 8 synthetic demo cases
│           ├── entity_extractor.py     # Step 4: Gemini-powered org/AI system linking
│           └── scheduler.py           # APScheduler weekly CourtListener job
│
└── frontend/
    ├── Dockerfile
    ├── nginx.conf                      # Reverse proxy: /api/ → backend:8000
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                     # Shell: nav bar + React Router routes
        ├── api.js                      # All fetch() calls to the backend
        └── pages/
            ├── Dashboard.jsx           # Stats cards + recent cases
            ├── GraphExplorer.jsx       # D3 force graph (Direction 1)
            ├── ResearchNavigator.jsx   # NL search (Direction 5)
            ├── WaveDetector.jsx        # Litigation waves (Direction 4)
            ├── ReviewQueue.jsx         # Human-in-the-loop approval
            ├── CaseDetail.jsx          # Full case view with neighbors
            ├── ApiExplorer.jsx         # Live REST console — all 18 endpoints in-browser
            └── DataPipeline.jsx        # Architecture diagram + data transformation showcase
```

---

## Graph Schema

### Node Types

| Label | Key Property | Description |
|-------|-------------|-------------|
| `Case` | `id` (slug) | AI litigation case from DAIL |
| `Organization` | `canonicalName` | Defendant / plaintiff company |
| `AISystem` | `name` | AI product involved (ChatGPT, Clearview, etc.) |
| `LegalTheory` | `name` | Cause of action (BIIPA, copyright, negligence…) |
| `Court` | `name` | Filing court |
| `Docket` | `docketId` | CourtListener docket record |
| `Document` | `documentId` | PDF/filing linked to a case |
| `SecondarySource` | `link` | Academic paper / news article |
| `ReviewItem` | `id` | Pending human review task |
| `IngestRun` | `timestamp` | Audit log of CourtListener ingestion runs |

### Relationships

```
(Case)-[:NAMED_DEFENDANT]->(Organization)
(Case)-[:INVOLVES_SYSTEM]->(AISystem)
(Case)-[:ASSERTS_CLAIM]->(LegalTheory)
(Case)-[:FILED_IN]->(Court)
(Case)-[:HAS_DOCKET]->(Docket)
(Case)-[:HAS_DOCUMENT]->(Document)
(Case)-[:HAS_SECONDARY_SOURCE]->(SecondarySource)
```

### Confidence Thresholds (AI Extraction)

| Confidence | Action |
|------------|--------|
| ≥ 0.85 | Auto-approved → written directly to graph |
| 0.70 – 0.84 | Queued → `ReviewItem` node for human approval |
| < 0.70 | Discarded |

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend |
| Node.js | 20+ | Frontend |
| Docker Desktop | latest | Neo4j container |
| Google Gemini API key | — | Entity extraction, NL search, wave narratives |

---

## Environment Setup

```bash
cd dail-knowledge-graph
cp .env.example .env
```

Edit `.env`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=dail_password
GEMINI_API_KEY=your_gemini_api_key_here
COURTLISTENER_BASE_URL=https://www.courtlistener.com
```

---

## Running the Project

### Step 1 — Start Neo4j

```bash
cd dail-knowledge-graph
docker-compose up neo4j -d
```

Neo4j browser available at: http://localhost:7474 (login: `neo4j` / `dail_password`)

### Step 2 — Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 3 — Seed the database

See [Data Seeding](#data-seeding) below. Minimum required before starting the backend:

```bash
# From backend/
python -m app.ingest.demo_seed        # Quick start with 8 synthetic cases
# OR seed from real Excel data (see Data Seeding section)
```

### Step 4 — Start the backend

```bash
# From backend/
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Note (Windows):** Use `python -m uvicorn` — the bare `uvicorn` command may not be on PATH.

API docs available at: http://localhost:8000/docs

### Step 5 — Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at: http://localhost:5173

---

## Data Seeding

This is a four-step pipeline for loading the real DAIL Excel data.

### Step 1 — Convert Excel to CSV

Place the four Excel files in `data/`:
- `DAIL_Cases.xlsx`
- `DAIL_Dockets.xlsx`
- `DAIL_Documents.xlsx`
- `DAIL_Secondary_Sources.xlsx`

```bash
# From backend/
python -m app.ingest.convert_xlsx
```

What this does:
- Normalises case slugs (`Case_snug`) — generates slugs for the ~190 cases missing them
- Standardises `Status_Disposition` to title case
- Converts dates to ISO format
- Outputs clean CSVs to `data/`

### Step 2 — Seed Neo4j

```bash
python -m app.ingest.seed_from_excel
```

Seeds all node types in order: Cases → Dockets → Documents → Secondary Sources → Legal Theories → AI Systems → Courts.
Uses a numeric `Case_Number` → slug lookup to correctly link child records.

Expected output (375 real cases):
```
382 cases  ·  358 dockets  ·  794 documents  ·  347 secondary sources
164 legal theories  ·  149 courts
```

### Step 3 — Entity Extraction (Gemini)

Extracts `Organization` and `AISystem` nodes from case text and creates
`NAMED_DEFENDANT` / `INVOLVES_SYSTEM` relationships.

```bash
python -m app.ingest.entity_extractor
```

Processes only cases that have `organizations` text but no existing graph relationships (safe to re-run).
Takes ~5–10 minutes for 375 cases. Progress printed every 10 cases.

Expected output:
```
Processing 179 cases for entity extraction...
Entity extraction complete: 476 auto-approved, 5 queued for review
```

### Step 4 — SQL Export (optional)

Exports the clean CSV data to a portable SQLite database and generates SQL schema + INSERT
files compatible with PostgreSQL, MySQL, and SQLite.

```bash
python -m app.ingest.export_sql
```

Outputs to `data/`:
- `dail.db` — self-contained SQLite database (open with any SQL tool)
- `schema.sql` — `CREATE TABLE` statements for any SQL engine
- `data.sql` — `INSERT` statements for all four tables

To load into PostgreSQL:
```bash
psql -d your_db -f data/schema.sql
psql -d your_db -f data/data.sql
```

### Final graph state

```
382 cases  ·  546 organizations  ·  177 AI systems  ·  164 legal theories
149 courts  ·  794 documents  ·  347 secondary sources  ·  3,732 relationships
```

---

## API Reference

All routes are prefixed with `/api/v1`. Full interactive docs at `/docs`.

### Graph

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/graph/overview` | Node and relationship counts |
| `GET` | `/graph/defendants?limit=20` | Top defendants by case count (max 500) |
| `GET` | `/graph/defendants/{org}/cases` | All cases for a defendant |
| `GET` | `/graph/orgs/search?q=openai` | Partial-name org search, ranked by case count |
| `GET` | `/graph/cases-by-year` | Case counts grouped by filing year (2016+) |
| `GET` | `/graph/ai-systems?limit=15` | Top AI systems by case count |
| `GET` | `/graph/theories/{theory}/cases` | Cases asserting a legal theory |

### Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/cases/` | Paginated case list with filters |
| `GET` | `/cases/{id}` | Full case detail |
| `GET` | `/cases/{id}/neighbors` | Case neighborhood (orgs, systems, theories, courts) |
| `GET` | `/cases/{id}/similar` | Similar cases via shared relationships |
| `GET` | `/cases/{id}/secondary-sources` | Academic / news links for a case |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/search/` | Natural language → Cypher → narrative |

Request body:
```json
{ "question": "Which organizations face the most BIPA claims in Illinois?" }
```

Response includes: generated Cypher, explanation, raw results, and a plain-English narrative.

### Ingest

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingest/trigger` | Manually trigger CourtListener ingestion |
| `GET` | `/ingest/waves?window_days=90&threshold=3` | Detect litigation waves |
| `GET` | `/ingest/history` | Last 10 ingestion run records |
| `GET` | `/ingest/staged` | Cases pending human review from auto-ingest |

### Review Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/review/queue` | Pending review items |
| `GET` | `/review/stats` | Queue statistics |
| `POST` | `/review/{id}/approve` | Approve an extraction |
| `POST` | `/review/{id}/reject` | Reject an extraction |

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Animated stat cards, stacked-bar defendant/AI-system tables, filing trend chart |
| `/graph` | Graph Explorer | D3 force graph — defendant influence map |
| `/search` | Research Navigator | Natural language research interface |
| `/waves` | Wave Detector | Litigation cluster detection |
| `/review` | Review Queue | Human-in-the-loop extraction review |
| `/cases/:id` | Case Detail | Full case view with related nodes |
| `/api` | API Explorer | Live REST console — execute all 20 endpoints in-browser |
| `/pipeline` | Architecture | System diagram + before/after data transformation showcase |

---

## Production (Docker)

To run all three services together:

```bash
cd dail-knowledge-graph
docker-compose up --build
```

| Service | Port | URL |
|---------|------|-----|
| Frontend (nginx) | 5173 | http://localhost:5173 |
| Backend (FastAPI) | 8000 | http://localhost:8000 |
| Neo4j | 7474 / 7687 | http://localhost:7474 |

In Docker, the frontend nginx config proxies `/api/` requests to `http://backend:8000` via the internal Docker network.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph DB | Neo4j 5 Community (Docker) |
| Backend | Python 3.11, FastAPI, neo4j driver (async), pydantic-settings |
| AI | Google Gemini 2.5 Flash (`google-genai` SDK) |
| Scheduler | APScheduler 3.x (`AsyncIOScheduler`) |
| Data | pandas, openpyxl |
| Frontend | React 18, Vite, Tailwind CSS v4, D3.js v7, React Router v6 |
| Container | Docker Compose v3.9 |

---

## Demo Queries

Three powerful queries now possible that were not possible with the flat spreadsheet:

### 1. Top defendants by case count
```
GET /api/v1/graph/defendants?limit=10
```

### 2. Natural language research question
```
POST /api/v1/search/
{"question": "Which organizations face the most BIPA claims in Illinois?"}
```

### 3. All cases involving a specific AI system
```
POST /api/v1/search/
{"question": "Find all cases involving facial recognition AI"}
```

These queries traverse relationships across 382 cases, 546 organizations, and 3,732 graph edges — impossible in the original flat-file system.
