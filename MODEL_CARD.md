# DAIL Living Case Graph — Model Card

## Project Overview
The DAIL Living Case Graph modernizes the Database of AI Litigation (GWU Law) from a flat
Caspio/WordPress system into a Neo4j knowledge graph that automatically connects 375+ AI
litigation cases through semantic relationships, with a live ingestion pipeline and a
conversational research interface.

## Implemented Directions & Features

### Direction 1 — Defendant Influence Map (Core)
- Extracts organizations and AI systems from case data into graph nodes
- Connects cases by shared defendants, legal theories, AI systems, and courts
- Human-in-the-loop review queue for low-confidence extractions

### Direction 4 — Litigation Wave Detector
- CourtListener API ingestion pipeline with APScheduler (weekly polling)
- Gemini classifies incoming cases for AI litigation relevance
- Wave detection algorithm flags coordinated litigation campaigns (≥3 cases in 60 days)

### Direction 5 — Research Navigator
- Natural language → Cypher translation via Gemini
- Executes read-only queries against Neo4j
- Narrates traversal paths in plain legal English with explainability panel

### SQL-Ready Data Pipeline
- `convert_xlsx.py` produces clean, normalised CSVs from the four DAIL Excel workbooks
- `export_sql.py` exports those CSVs to a SQLite database (`dail.db`), a portable `schema.sql`
  (PostgreSQL / MySQL / SQLite compatible), and a `data.sql` INSERT file
- The pipeline satisfies the "Clean, SQL-ready structured data pipeline" requirement independently
  of the graph database layer

### In-Browser API Explorer (`/api`)
- Interactive REST console listing all 18 endpoints with live request/response execution
- Eliminates need for Postman or curl to demonstrate the API layer

### Architecture & Pipeline Page (`/pipeline`)
- Visual system architecture diagram across all five layers
- Interactive step-by-step pipeline walkthrough
- Before/after data transformation showcase (Excel flat row → graph nodes)

## AI Models Used
- **gemini-2.5-flash (Google Gemini)**: Entity extraction, case classification, NL→Cypher, narrative generation

## Data Sources
- DAIL dataset (GWU Law) — 375+ AI litigation cases
- CourtListener REST API — ongoing ingestion of new federal court dockets

## Safety & Review
- All Gemini extractions below 0.85 confidence go to human review queue
- Cypher queries are validated to block write operations
- Entity extractions are traceable back to source text

## Stack
Neo4j 5 + FastAPI (Python 3.11) + Google Gemini API + CourtListener REST API +
React 18 + Vite + Tailwind CSS + D3.js + SQLite (SQL export layer)
