# Contributing to DAIL Knowledge Graph

## Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop
- A Google Gemini API key (get one at https://aistudio.google.com)

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/Nikhil123n/dail-knowledge-graph.git
cd dail-knowledge-graph

# 2. Configure environment
cp .env.example .env
# Edit .env and set GEMINI_API_KEY

# 3. Start Neo4j
docker-compose up neo4j -d

# 4. Install backend dependencies
cd backend
pip install -r requirements.txt

# 5. Seed demo data
python -m app.ingest.demo_seed

# 6. Start backend
python -m uvicorn app.main:app --reload

# 7. Start frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

## Making Changes

- Backend routes live in `backend/app/api/routes/`
- All Cypher queries live in `backend/app/services/neo4j_service.py`
- Frontend pages live in `frontend/src/pages/`

## Pull Request Guidelines

- One logical change per PR
- Include a clear description of what and why
- Backend changes: verify the relevant API endpoint still responds correctly
- Frontend changes: verify the page renders without console errors

## Troubleshooting

**`uvicorn: command not found`**
Use `python -m uvicorn` instead of bare `uvicorn` (common on Windows).

**`Neo4j connection refused`**
Ensure Docker Desktop is running and the neo4j container is up:
```bash
docker-compose up neo4j -d
docker-compose ps
```

**`GEMINI_API_KEY not set`**
Copy `.env.example` to `.env` and set your Gemini API key.
