# DAIL Living Case Graph — Technical Brief
## For Judges: Architecture, Stack, and Differentiation

---

## The One-Sentence Technical Summary

We transformed a static, flat Excel dataset into a **live, queryable, AI-augmented knowledge graph** with a domain-specific natural language research interface, automated court data ingestion, and a litigation wave detection engine — all running as a production-ready web application.

---

## The Question We Directly Answer: How Are You Different From Neo4j Bloom + Gephi?

This is the most important technical question for this project. Let's address it head-on.

### What Neo4j Bloom Does
Neo4j Bloom is Neo4j's own built-in graph visualization tool. It lets you:
- Click around a graph visually
- Search using "natural language" that maps to pre-configured templates
- See node properties in a sidebar

**The limitation:** Bloom is a *viewer*. You bring it data, it shows it to you. It has no concept of your domain. It cannot ask "which defendants are running a litigation defense across three states simultaneously?" It cannot detect patterns. It cannot learn from new case filings. It cannot explain its results.

**In plain terms:** Bloom is like Google Maps with no routing. You can see the roads, but you can't ask it to take you anywhere meaningful.

### What Gephi Does
Gephi is an open-source desktop application for network analysis. Researchers use it to:
- Load a static graph snapshot (CSV or GEXF format)
- Apply layout algorithms (ForceAtlas2, Fruchterman-Reingold)
- Calculate centrality metrics (degree, betweenness, PageRank)
- Export visualizations as images

**The limitation:** Gephi is *offline and static*. You export a snapshot today, and tomorrow it is already out of date. It has no API. It cannot receive new court filings. It has no AI. It cannot answer a question in English. It is a desktop tool, not a web application, meaning it cannot be shared, embedded, or operated by a non-technical user.

**In plain terms:** Gephi is a microscope. Powerful for analysis, but you have to be a scientist to use it, and the sample cannot update itself while you're looking.

---

### What We Built Instead: The Three Differences That Matter

#### Difference 1 — The Graph Is Not the Product, the Intelligence Is

| Capability | Neo4j Bloom | Gephi | DAIL Living Case Graph |
|---|---|---|---|
| Visualize a graph | Yes | Yes | Yes |
| Natural language query (free-form) | No — template-only | No | Yes — Gemini 2.5 Flash |
| Generate plain-English research narrative | No | No | Yes |
| Show the query it ran (explainability) | No | No | Yes |
| Detect behavioral patterns (waves) | No | No | Yes |
| Classify new data with AI | No | No | Yes |

#### Difference 2 — The Graph Is Alive

| Capability | Neo4j Bloom | Gephi | DAIL Living Case Graph |
|---|---|---|---|
| Static data only | No — any Neo4j source | Yes — file import only | No — live API ingest |
| Pulls from CourtListener API | No | No | Yes — weekly scheduler |
| Auto-classifies new cases | No | No | Yes — Gemini classification |
| Human review queue for low-confidence data | No | No | Yes |
| Audit trail of ingestion runs | No | No | Yes — IngestRun nodes |

#### Difference 3 — The Graph Is Accessible

| Capability | Neo4j Bloom | Gephi | DAIL Living Case Graph |
|---|---|---|---|
| Web application | Browser (Neo4j Desktop/AuraDB) | No — desktop only | Yes — React 18 + Vite |
| Usable without Cypher knowledge | Partially | No | Yes — full NL interface |
| Embeddable / shareable URL | No | No | Yes |
| Mobile-accessible | No | No | Yes |
| Domain-specific search context | No | No | Yes — legal framing |

---

## Architecture: How It Actually Works

```
BROWSER (React 18 + D3.js + Tailwind CSS)
    │
    │  HTTP /api/v1/*  (JSON over REST)
    ▼
FASTAPI BACKEND (Python 3.11, async)
    │
    ├── /graph/*      ── Cypher queries via neo4j async driver
    ├── /cases/*      ── Paginated case retrieval + neighborhood traversal
    ├── /search/      ── NL → Gemini → Cypher → Neo4j → Gemini → Narrative
    ├── /ingest/*     ── CourtListener REST + APScheduler weekly job
    └── /review/*     ── Human-in-the-loop approval queue
    │
    ├── neo4j_service.py    (all Cypher, schema init, constraints)
    ├── claude_service.py   (Gemini 2.5 Flash API — entity extract, classify, narrate)
    ├── wave_detector.py    (pattern detection algorithm)
    └── courtlistener.py    (federal court REST client)
    │
    │  Bolt Protocol (port 7687)
    ▼
NEO4J 5 COMMUNITY
    │
    └── Graph schema: Case, Organization, AISystem, LegalTheory,
                      Court, Docket, Document, SecondarySource,
                      ReviewItem, IngestRun
                      (3,732 relationships across 382 cases)
```

**Why this architecture?**
- **Neo4j over PostgreSQL/MongoDB:** Relationships are first-class citizens in Neo4j. A query like "find all cases sharing two or more defendants AND the same legal theory" is a 2-line Cypher query. In SQL it is a multi-table join with subqueries. In a document store it is a full collection scan.
- **FastAPI over Flask/Django:** Native async support means Neo4j queries and Gemini API calls run concurrently without blocking each other. Critical for the NL search pipeline which chains two AI calls.
- **Gemini 2.5 Flash over GPT-4o-mini:** Higher context window, faster response time, and Google's structured output schema enforcement which is essential for reliable JSON extraction from legal text.
- **APScheduler over Celery/cron:** Zero infrastructure overhead. The scheduler lives inside the FastAPI process, requiring no separate Redis broker or worker processes.

---

## The Five Technical Features That Are Unique to This Project

### Feature 1 — The NL → Cypher → Narrative Pipeline

**What it does:** A user types a research question in plain English. The system:
1. Sends the question + graph schema to Gemini 2.5 Flash
2. Gemini generates a Cypher query
3. The query is validated against a read-only whitelist (no WRITE, CREATE, DELETE allowed)
4. The query executes against Neo4j
5. The raw results are sent back to Gemini with the original question
6. Gemini narrates the traversal path and findings in legal plain English

**Why it is technically significant:** This is not a lookup. This is a multi-hop reasoning chain across a live graph database, with an AI layer that understands the domain (legal theories, defendant networks, jurisdictions) rather than just the data structure.

**Layman version:** You type a question. The system figures out how to find the answer inside the graph, finds it, then explains what it found — like asking a research assistant who both knows law and knows how to write code.

---

### Feature 2 — Confidence-Gated AI Extraction with Human Review

**What it does:** When the entity extraction pipeline processes case text:
- Gemini returns extracted entities (organizations, AI systems) with a confidence score (0.0 – 1.0)
- Score ≥ 0.85 → written directly to the graph as a confirmed relationship
- Score 0.70 – 0.84 → stored as a `ReviewItem` node, surfaced in the review queue for a human to approve or reject
- Score < 0.70 → discarded

**Why it is technically significant:** Most AI extraction pipelines are binary — accept or reject. This three-tier gate creates a probabilistic human-AI collaboration system where the AI handles high-confidence bulk work and humans focus exclusively on edge cases. The review queue UI is fully functional: approve/reject with a single click, and approved items are immediately merged into the graph.

**Layman version:** The AI grades its own work. When it is confident, it acts. When it is not sure, it raises its hand and waits for a human. Nothing uncertain gets into the database without a human deciding.

---

### Feature 3 — Litigation Wave Detection Algorithm

**What it does:** The `detect_waves()` function queries Neo4j for:
- Any `Organization` node that is a defendant in ≥ 3 cases
- Where all filings occurred within a configurable rolling window (default: 60 days)
- Groups them by defendant and time cluster
- Passes each cluster to Gemini for briefing note generation

**Why it is technically significant:** This converts a pattern-recognition problem into a graph traversal problem. The question "are three cases filed against the same defendant within 60 days?" is trivially expressible in Cypher (`WHERE c.filing_date >= date() - duration('P60D')`) but nearly impossible to answer in a spreadsheet without manual filtering.

**Layman version:** The system watches for when multiple lawyers start suing the same company at the same time — which usually means something significant is happening — and alerts researchers with an AI-written summary before the news picks it up.

---

### Feature 4 — Live Federal Court Data Ingestion

**What it does:**
- APScheduler triggers a weekly job
- CourtListener REST API is queried for new federal dockets matching AI-related keywords
- Each returned case is sent to Gemini for classification: *Is this an AI litigation case?*
- Classified cases are staged for human review before being merged into the main graph
- Full `IngestRun` audit nodes are written to the graph on every cycle

**Why it is technically significant:** The DAIL dataset is a curated snapshot. The live ingest layer makes it a living document. The architecture separates ingestion from classification from acceptance — three distinct stages, each with its own failure boundary.

**Layman version:** Every week, the system automatically checks federal court records for new AI lawsuits, has an AI decide if they're relevant, and queues them up for researchers to confirm — all without anyone manually doing anything.

---

### Feature 5 — Force-Graph with Semantic Neighborhood Expansion

**What it does:**
- D3.js v7 renders a force-directed graph in the browser
- Nodes are typed (Case, Organization, AISystem, LegalTheory, Court)
- Clicking a node fetches its neighborhood from the `/cases/{id}/neighbors` endpoint
- The graph expands dynamically — adjacent nodes animate in
- Node size is proportional to relationship degree (more connections = larger node)
- Clicking an Organization shows all cases in which it appears as a defendant

**Why it is technically significant:** This is not a static graph image. It is a live interface that queries the database on every click, rendering only the subgraph relevant to what the user is exploring. The visual encoding (size = influence, proximity = relationship) makes structural patterns in the litigation landscape immediately legible without requiring the user to know anything about graph theory.

**Layman version:** The graph is interactive. The more cases a company is involved in, the bigger their dot. Click the dot, and every lawsuit connected to them appears. It is the litigation landscape, made visible.

---

### Feature 6 — SQL Export Pipeline (Closing the SQL-Ready Gap)

**What it does:** `export_sql.py` reads the clean CSVs produced by `convert_xlsx.py` and outputs three SQL-ready artefacts:
- `data/dail.db` — a self-contained SQLite database openable in any SQL tool
- `data/schema.sql` — `CREATE TABLE` + index statements compatible with PostgreSQL, MySQL, and SQLite
- `data/data.sql` — `INSERT` statements for all four tables, loadable into any SQL engine

**SQL schema covers four normalised tables:**
- `cases` — all 20+ fields, list columns stored as pipe-separated strings
- `dockets` — linked to cases via `case_id` foreign key
- `documents` — ISO date fields, document type, citation reference
- `secondary_sources` — academic and news links per case

**Why it is technically significant:** The problem statement explicitly requires a "Clean, SQL-ready structured data pipeline." The graph database (Neo4j) uses Cypher, not SQL. The SQL export closes this gap entirely: the same clean data that feeds Neo4j can now also be loaded into any relational database with two commands (`psql -f schema.sql && psql -f data.sql`). The pipeline is genuinely database-agnostic.

**Layman version:** Run one script, get a working SQL database containing the full DAIL dataset. Open it in any spreadsheet tool, query it with standard SQL, or load it into PostgreSQL for a university's existing data infrastructure — no Neo4j required.

---

### Feature 7 — In-Browser API Explorer

**What it does:** A React page at `/api` lists all 18 REST endpoints grouped by domain (Graph, Cases, Search, Ingest, Review). Each endpoint has:
- Inline input fields for path and query parameters
- A JSON body editor for POST requests with pre-filled example bodies
- A live Execute button that fires a real HTTP request to the running backend
- A syntax-highlighted JSON response panel with HTTP status code and response time in milliseconds

**Why it is technically significant:** Eliminates the need for Postman, curl, or any external tool to demonstrate the API. Judges can test any endpoint without leaving the browser. The Search endpoint lets them type a natural language question and watch Gemini generate and execute a Cypher query in real time.

---

## Tech Stack — Every Choice Explained

| Layer | Technology | Why This, Not That |
|---|---|---|
| Graph Database | Neo4j 5 Community | Native graph storage with Cypher — relationships are indexed, not computed. Faster multi-hop traversal than any relational alternative. |
| Backend Framework | FastAPI (Python 3.11) | Native async. Pydantic validation built in. Auto-generates OpenAPI docs. Lightest path to a production-grade API. |
| AI Provider | Google Gemini 2.5 Flash | Structured output enforcement (required for reliable JSON from legal text). High context window for long case documents. |
| Graph Driver | neo4j (official async Python driver) | Async session management, connection pooling, Bolt protocol support out of the box. |
| Scheduler | APScheduler 3.x | Zero external dependencies. Runs inside FastAPI process. No Redis, no Celery, no separate worker. |
| Frontend Framework | React 18 + Vite | Component model maps naturally to the multi-panel UI. Vite's HMR makes iteration fast. |
| Graph Visualization | D3.js v7 | Industry standard for data-driven SVG. Force simulation gives physical intuition to graph structure. No black-box wrapper. |
| Styling | Tailwind CSS v4 | Utility-first. No stylesheet to maintain. Consistent spacing and color without a design system. |
| Data Ingestion Source | CourtListener REST API | Free, comprehensive federal court record coverage. Structured JSON responses with docket metadata. |
| Data Input Format | Excel (pandas + openpyxl) | GWU Law's existing format. Zero friction for the real-world operator. |
| SQL Export | SQLite + schema.sql (export_sql.py) | Produces a SQL-ready database and schema from the same clean CSVs, satisfying the SQL-ready pipeline requirement without replacing the graph store. |
| Containerization | Docker Compose v3.9 | Single-command startup for all three services (Neo4j + backend + frontend). |

---

## Graph Schema — Why the Relationships Matter

```
(Case)-[:NAMED_DEFENDANT]->(Organization)
(Case)-[:INVOLVES_SYSTEM]->(AISystem)
(Case)-[:ASSERTS_CLAIM]->(LegalTheory)
(Case)-[:FILED_IN]->(Court)
(Case)-[:HAS_DOCKET]->(Docket)
(Case)-[:HAS_DOCUMENT]->(Document)
(Case)-[:HAS_SECONDARY_SOURCE]->(SecondarySource)
```

**What this enables that a spreadsheet cannot:**

| Query Type | Flat File | Knowledge Graph |
|---|---|---|
| "All cases involving Clearview AI" | Column filter | `MATCH (c:Case)-[:INVOLVES_SYSTEM]->(:AISystem {name:'Clearview AI'}) RETURN c` |
| "Defendants sued under BIPA AND copyright" | Two filters + manual intersection | 2-hop traversal through shared LegalTheory nodes |
| "Cases connected through shared defendants" | Impossible without pivot table | Direct graph traversal |
| "Which legal theories most often co-occur?" | Impossible in flat structure | Pattern matching across shared Case nodes |
| "Defendants with cases in 3+ jurisdictions" | Manual count across rows | Degree query on Court relationship |

---

## Final Numbers (Seeded Database)

| Entity | Count |
|---|---|
| Cases | 382 |
| Organizations (defendants/plaintiffs) | 546 |
| AI Systems | 177 |
| Legal Theories | 164 |
| Courts | 149 |
| Documents | 794 |
| Secondary Sources | 347 |
| Total Relationships | 3,732 |
| Auto-approved AI extractions | 476 |
| Queued for human review | 5 |

---

## The One Thing That Makes This Real

> Every piece of data in this graph traces back to a real case filed by a real person
> against a real company for something a real AI system did. This is not synthetic.
> This is not demonstration data. This is the legal record of AI in the world,
> made queryable for the first time.

---

*DAIL Living Case Graph*
*Neo4j 5 · FastAPI · Google Gemini 2.5 Flash · React 18 · D3.js · CourtListener API*
*GWU Law — Database of AI Litigation*
