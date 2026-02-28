# DAIL Living Case Graph
## 5-Minute Hackathon Presentation Script

**Format:** Live software demo with verbal presentation (no slides)
**Time Limit:** 5 minutes exactly
**Audience:** Hackathon judges and technical attendees
**Word Count:** ~650 words

---

## PRE-SHOW SETUP

> Have the app open at the **Dashboard** (localhost:5173).
> Neo4j running, backend healthy.
> Graph Explorer tab loaded in background.
> Research Navigator search bar cleared and ready.

---

## [0:00 – 1:00] THE HOOK & PROBLEM

[Stand in front of the screen. Speak directly to judges. Do NOT touch the demo yet.]

"Somewhere in a federal courthouse right now, a lawyer is filing a case against an AI
company — and a researcher at George Washington University Law School (has no idea
it happened.)

GWU Law maintains the **Database of AI Litigation** — the most comprehensive public
record of AI lawsuits in the United States. 375 cases. Facial recognition gone wrong,
biometric data harvested without consent, algorithms making life-altering decisions.

But here's the problem —"

[Pause. Rhetorical beat. Let silence hold for 2 seconds.]

"It lives in a *spreadsheet.*"

*(Spreadsheet. In 2025. For tracking the legal future of artificial intelligence.)*

[Humor tone — small, dry smile. Let it land for 1–2 seconds.]

"You can't ask a spreadsheet: *'Which defendants are being hit from multiple legal
angles simultaneously?'* You can't ask it to *detect a coordinated litigation campaign
before it makes headlines.* We built something that can."

[Turn to screen.]

---

## [1:00 – 2:00] THE GRAPH — DEMO SEGMENT 1

{Demo: Navigate to Graph Explorer. The D3 force-graph animates into view.}

"This is the **DAIL Living Case Graph** — 382 cases, 546 organizations, and over 3,700
relationships, rendered as a live knowledge graph on Neo4j."

[Point to clusters forming on screen.]

"Every node you see is a *real entity* — a company, an AI system, a legal theory, a
courthouse. Every edge is a *real relationship* pulled from the DAIL dataset. What
was invisible in a flat file is now (structurally visible) for the first time."

{Demo: Click a defendant node — a major tech company. Case neighborhood expands.}

"Click any defendant and you instantly see their full litigation footprint — which AI
systems they're fielding, which legal theories are being asserted against them, across
which courts."

[Rhetorical question — look up at the audience briefly:]

"Would *you* want to know if a company you're invested in just became the defendant
in their third BIPA claim this month? We would too."

---

## [2:00 – 3:00] THE BRAIN — DEMO SEGMENT 2

{Demo: Navigate to Research Navigator. Search bar is empty and ready.}

"Now — the part that makes this more than a pretty graph."

"Judges, policy researchers, journalists — they don't speak Cypher. They speak
English. So we built a **natural language research interface** powered by
Google Gemini 2.5 Flash."

{Demo: Type into the search bar — "Which organizations face the most BIPA claims in Illinois?"}

"Watch what happens."

[Let the query run. Point to the Cypher being generated in the explainability panel.]

"Gemini translates the question into a *read-only* Cypher graph query — shown here
for full transparency — executes it against Neo4j, then narrates the traversal path
in plain legal English."

[Point to the results panel.]

"Not a keyword search. Not a filter. A *semantic graph traversal* — across defendants,
legal theories, jurisdictions — explained like a research memo."

*(That's the difference between a database and a thinking tool.)*

---

## [3:00 – 4:00] THE DETECTOR — DEMO SEGMENT 3

{Demo: Navigate to Wave Detector.}

"Here's where it gets operationally useful."

"The **Litigation Wave Detector** monitors for coordinated legal campaigns — any
defendant hit with three or more cases within a 60-day window. When a wave is
detected, Gemini auto-generates a briefing note explaining the pattern."

{Demo: Show a detected wave card with the AI-generated briefing note visible.}

"This runs on a weekly APScheduler job that polls the **CourtListener federal court
API**, classifies incoming cases for AI relevance, and routes low-confidence
extractions to a —"

{Demo: Flash briefly to Review Queue page.}

"— human review queue. Because we take (responsible AI seriously), not just as a
checkbox — as architecture."

[Humor tone — brief, natural:]

"The AI does the heavy lifting. A human keeps it honest. Sounds familiar."

---

## [4:00 – 5:00] THE CLOSE — CRITERIA & VISION

[Step back from screen slightly. Face judges directly. Slower, deliberate pace.]

"Let me be direct about what this is and isn't."

"Technically — Neo4j graph database, FastAPI async backend, React with D3.js force
visualization, Gemini for entity extraction and natural language to Cypher. Every AI
extraction is confidence-scored. Below 0.85 — it goes to human review. Nothing writes
to the graph without validation."

"Real-world relevance — GWU Law has an active dataset and an active need. This isn't
a demo project. This is a production-ready pipeline they can operate *today*, with
their existing Excel exports as the only required input."

"Feasibility beyond this room — the architecture is modular. Swap the data source.
Point it at GDPR enforcement actions, FDA drug recalls, SEC filings. The graph learns
whatever you feed it."

[Final beat. Steady eye contact with judges.]

"AI litigation is the fastest-growing area of law in the country. The people tracking
it deserve tools as sophisticated as the technology they're watching."

"We built those tools. (This is DAIL Living Case Graph.)"

[Hold. Done. Do not add anything after this line.]

---

## TIMING REFERENCE

| Timestamp | Segment                  | Key Action                                      |
|-----------|--------------------------|-------------------------------------------------|
| 0:00      | Hook & Problem           | Open cold — no demo. Eye contact with judges.   |
| 0:30      | "It lives in a spreadsheet" | Pause. Humor beat. Let silence work.          |
| 1:00      | Graph Explorer           | Navigate to force-graph. Click defendant node.  |
| 1:40      | Rhetorical question      | Look up. Engage audience directly.              |
| 2:00      | Research Navigator       | Type NL query. Point to Cypher panel.           |
| 2:50      | "Thinking tool" line     | Slower delivery. Let the contrast land.         |
| 3:00      | Wave Detector            | Show wave card + briefing note.                 |
| 3:30      | Review Queue flash       | Brief — 5 seconds only. Return to narration.    |
| 3:55      | Humor beat               | "Sounds familiar." Slight pause.                |
| 4:00      | Close                    | Step back from screen. Face judges.             |
| 4:50      | Final line               | Steady. No rush. Let it finish cleanly.         |

---

## HUMOR CUES (3 moments)

1. **[0:35]** — *"Spreadsheet. In 2025."*
   Delivery: Dry, understated. Do not over-explain. The pause before it does the work.

2. **[3:55]** — *"The AI does the heavy lifting. A human keeps it honest. Sounds familiar."*
   Delivery: Wry, self-aware. Nod slightly. Move on quickly — don't wait for laughs.

3. **[Implicit, 2:10]** — The live Cypher query generation itself is the visual punchline.
   Let the technical sophistication speak without narrating every detail.

---

## JUDGING CRITERIA COVERAGE MAP

| Criterion              | Where Addressed                                           |
|------------------------|-----------------------------------------------------------|
| Technical Quality      | Segment 3 close: Neo4j, FastAPI, D3.js, Gemini stack      |
| Clarity & Explainability | Segment 2: Explainability panel shown live during demo  |
| Real-World Relevance   | Segment 1 hook + Close: GWU Law active dataset            |
| Responsible Data Use   | Segment 3: Confidence threshold + human review queue      |
| Feasibility Beyond Hackathon | Close: Modular architecture, swap data source       |
| SQL-Ready Pipeline     | If asked: `export_sql.py` → `dail.db` + `schema.sql` — live demo on API Explorer or Architecture page |

## ADDITIONAL PAGES TO KNOW (if judges explore freely)

| Page | Route | What to say if asked |
|------|-------|----------------------|
| API Explorer | `/api` | "Every endpoint in the system is testable live from this page — no Postman needed. Type a question in Search and watch Gemini generate the Cypher query in real time." |
| Architecture | `/pipeline` | "This shows the full five-layer architecture and the before/after transformation of one Excel row into six connected graph nodes — the core of what we built." |

---

## SPEAKER NOTES

- **Do not read from a script.** These are internalized talking points. The demo is your teleprompter.
- **Silence is not dead air.** The 2-second pause after "spreadsheet" is intentional and effective.
- **Demo errors:** If any API call is slow, narrate what it's doing. *"Gemini is generating the Cypher query in real time — you can see it building out."* Turn latency into a feature.
- **Pacing:** Slow down 20% during the Cypher generation moment (2:10–2:30). Judges need time to absorb what they're seeing.
- **Handoff (if co-presenting):** Natural split at the 2:00 mark — Presenter 1 owns Hook + Graph, Presenter 2 owns Research Navigator + Wave Detector + Close.

---

*DAIL Living Case Graph — GWU Law AI Litigation Knowledge Graph*
*Built with Neo4j · FastAPI · React · D3.js · Google Gemini 2.5 Flash*
