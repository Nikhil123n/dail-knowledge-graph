import { useState } from "react";

// ─── Architecture diagram data ─────────────────────────────────────────────
const ARCH_LAYERS = [
  {
    label: "Data Sources",
    color: "border-amber-500 bg-amber-950",
    badge: "bg-amber-800 text-amber-200",
    nodes: [
      { icon: "📊", title: "DAIL Excel Files", sub: "4 worksheets · 375+ cases" },
      { icon: "⚖️", title: "CourtListener API", sub: "Federal court dockets (live)" },
    ],
  },
  {
    label: "Processing Layer",
    color: "border-violet-500 bg-violet-950",
    badge: "bg-violet-800 text-violet-200",
    nodes: [
      { icon: "🐍", title: "pandas + openpyxl", sub: "Excel → clean CSV pipeline" },
      { icon: "🤖", title: "Gemini 2.5 Flash", sub: "Entity extract · Classify · NL→Cypher" },
      { icon: "⏱️", title: "APScheduler", sub: "Weekly CourtListener ingest job" },
    ],
  },
  {
    label: "Storage",
    color: "border-emerald-500 bg-emerald-950",
    badge: "bg-emerald-800 text-emerald-200",
    nodes: [
      {
        icon: "🔵",
        title: "Neo4j 5 Graph DB",
        sub: "382 cases · 3,732 relationships · Bolt :7687",
      },
    ],
  },
  {
    label: "API Layer",
    color: "border-sky-500 bg-sky-950",
    badge: "bg-sky-800 text-sky-200",
    nodes: [
      { icon: "⚡", title: "FastAPI (Python 3.13)", sub: "20 async REST endpoints · /api/v1/*" },
    ],
  },
  {
    label: "Frontend",
    color: "border-rose-500 bg-rose-950",
    badge: "bg-rose-800 text-rose-200",
    nodes: [
      { icon: "⚛️", title: "React 18 + Vite", sub: "6 pages · D3.js · Tailwind CSS v4" },
    ],
  },
];

// ─── Example transformation data ──────────────────────────────────────────
const EXCEL_ROW = [
  { col: "Caption", val: "ACLU v. Clearview AI, Inc.", highlight: "text-white" },
  { col: "Organizations_involved", val: "ACLU; Clearview AI, Inc.", highlight: "text-amber-300" },
  { col: "Cause_of_Action_Text", val: "BIPA, Privacy", highlight: "text-violet-300" },
  { col: "Name_of_Algorithm_Text", val: "Clearview Facial Recognition", highlight: "text-sky-300" },
  { col: "Jurisdiction_Filed", val: "N.D. Ill.", highlight: "text-emerald-300" },
  { col: "Status_Disposition", val: "active", highlight: "text-slate-300" },
  { col: "Date_Action_Filed", val: "05/28/2020", highlight: "text-slate-300" },
  { col: "Area_of_Application_Text", val: "Facial Recognition", highlight: "text-rose-300" },
  { col: "Summary_of_Significance", val: "First major BIPA suit against...", highlight: "text-slate-400" },
];

// What the graph looks like after transformation
const GRAPH_NODES = [
  {
    id: "case",
    label: "Case",
    value: "ACLU v. Clearview AI",
    color: "bg-white text-slate-900",
    ring: "ring-white",
    cx: 300, cy: 160,
  },
  {
    id: "org1",
    label: "Organization",
    value: "Clearview AI, Inc.",
    color: "bg-amber-400 text-amber-950",
    ring: "ring-amber-400",
    cx: 100, cy: 60,
  },
  {
    id: "org2",
    label: "Organization",
    value: "ACLU",
    color: "bg-amber-400 text-amber-950",
    ring: "ring-amber-400",
    cx: 100, cy: 260,
  },
  {
    id: "theory1",
    label: "LegalTheory",
    value: "BIPA",
    color: "bg-violet-400 text-violet-950",
    ring: "ring-violet-400",
    cx: 300, cy: 310,
  },
  {
    id: "theory2",
    label: "LegalTheory",
    value: "Privacy",
    color: "bg-violet-400 text-violet-950",
    ring: "ring-violet-400",
    cx: 480, cy: 270,
  },
  {
    id: "ai",
    label: "AISystem",
    value: "Clearview Facial Recog.",
    color: "bg-sky-400 text-sky-950",
    ring: "ring-sky-400",
    cx: 500, cy: 80,
  },
  {
    id: "court",
    label: "Court",
    value: "N.D. Ill.",
    color: "bg-emerald-400 text-emerald-950",
    ring: "ring-emerald-400",
    cx: 300, cy: 30,
  },
];

const GRAPH_EDGES = [
  { from: "case", to: "org1", label: "NAMED_DEFENDANT" },
  { from: "case", to: "org2", label: "NAMED_PLAINTIFF" },
  { from: "case", to: "theory1", label: "ASSERTS_CLAIM" },
  { from: "case", to: "theory2", label: "ASSERTS_CLAIM" },
  { from: "case", to: "ai", label: "INVOLVES_SYSTEM" },
  { from: "case", to: "court", label: "FILED_IN" },
];

function getNode(id) {
  return GRAPH_NODES.find((n) => n.id === id);
}

// ─── Architecture diagram ──────────────────────────────────────────────────
function ArchDiagram() {
  return (
    <div className="space-y-3">
      {ARCH_LAYERS.map((layer, i) => (
        <div key={layer.label} className="flex items-center gap-3">
          {/* Layer label */}
          <div className="w-32 shrink-0 text-right">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${layer.badge}`}>
              {layer.label}
            </span>
          </div>

          {/* Down arrow between layers */}
          {i > 0 && null}

          {/* Nodes */}
          <div className="flex gap-3 flex-wrap flex-1">
            {layer.nodes.map((node) => (
              <div
                key={node.title}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${layer.color} flex-1 min-w-[180px]`}
              >
                <span className="text-lg">{node.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{node.title}</p>
                  <p className="text-xs text-slate-400 leading-tight">{node.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Connector line (right side) */}
          {i < ARCH_LAYERS.length - 1 && (
            <div className="flex flex-col items-center w-6 shrink-0">
              <div className="w-px h-3 bg-slate-600" />
              <span className="text-slate-500 text-xs">↓</span>
            </div>
          )}
        </div>
      ))}

      {/* AI + Scheduler side annotations */}
      <div className="mt-4 border-t border-slate-700 pt-4 grid grid-cols-2 gap-4 text-xs text-slate-400">
        <div className="space-y-1">
          <p className="font-semibold text-slate-300">AI Touchpoints (Gemini 2.5 Flash)</p>
          <p>• Entity extraction from free-text organizations field</p>
          <p>• Case classification for CourtListener ingestion</p>
          <p>• Natural language → Cypher translation</p>
          <p>• Graph result narration in plain legal English</p>
          <p>• Litigation wave briefing note generation</p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-slate-300">Data Integrity Controls</p>
          <p>• Source Excel files are never modified (read-only)</p>
          <p>• AI extractions confidence-gated at 0.85</p>
          <p>• 0.70–0.84 → human review queue</p>
          <p>• All Cypher queries validated read-only before execution</p>
          <p>• IngestRun audit nodes written on every pipeline cycle</p>
        </div>
      </div>
    </div>
  );
}

// ─── Data transformation mini graph ───────────────────────────────────────
function MiniGraph() {
  const W = 600;
  const H = 340;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-2xl mx-auto">
      {/* Edges */}
      {GRAPH_EDGES.map((e) => {
        const from = getNode(e.from);
        const to = getNode(e.to);
        if (!from || !to) return null;
        const mx = (from.cx + to.cx) / 2;
        const my = (from.cy + to.cy) / 2;
        return (
          <g key={`${e.from}-${e.to}`}>
            <line
              x1={from.cx} y1={from.cy}
              x2={to.cx} y2={to.cy}
              stroke="#475569" strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <rect
              x={mx - 46} y={my - 8}
              width="92" height="16" rx="4"
              fill="#1e293b" stroke="#334155" strokeWidth="1"
            />
            <text
              x={mx} y={my + 4}
              textAnchor="middle"
              fontSize="7" fill="#94a3b8"
              fontFamily="monospace"
            >
              {e.label}
            </text>
          </g>
        );
      })}
      {/* Nodes */}
      {GRAPH_NODES.map((node) => {
        const colors = {
          "bg-white text-slate-900": ["#ffffff", "#1e293b"],
          "bg-amber-400 text-amber-950": ["#fbbf24", "#451a03"],
          "bg-violet-400 text-violet-950": ["#a78bfa", "#2e1065"],
          "bg-sky-400 text-sky-950": ["#38bdf8", "#082f49"],
          "bg-emerald-400 text-emerald-950": ["#34d399", "#022c22"],
        };
        const [fill, textCol] = colors[node.color] || ["#64748b", "#fff"];
        const isCase = node.id === "case";
        const r = isCase ? 22 : 16;
        const labelLines = node.value.length > 16
          ? [node.value.slice(0, 16), node.value.slice(16)]
          : [node.value];
        return (
          <g key={node.id}>
            <circle
              cx={node.cx} cy={node.cy} r={r}
              fill={fill} stroke={isCase ? "#6366f1" : "#334155"}
              strokeWidth={isCase ? 2.5 : 1.5}
            />
            {/* Value label below circle */}
            {labelLines.map((line, li) => (
              <text
                key={li}
                x={node.cx}
                y={node.cy + r + 12 + li * 11}
                textAnchor="middle"
                fontSize={isCase ? "9" : "8"}
                fontWeight={isCase ? "700" : "400"}
                fill="#e2e8f0"
                fontFamily="sans-serif"
              >
                {line}
              </text>
            ))}
            {/* Type label above circle */}
            <text
              x={node.cx}
              y={node.cy - r - 4}
              textAnchor="middle"
              fontSize="7"
              fill="#94a3b8"
              fontFamily="monospace"
            >
              :{node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Transformation step timeline ─────────────────────────────────────────
const PIPELINE_STEPS = [
  {
    step: "1",
    color: "bg-amber-500",
    title: "Excel Source (Unmodified)",
    desc: "GWU Law's four Excel workbooks are the read-only source of truth. Never written to.",
  },
  {
    step: "2",
    color: "bg-orange-500",
    title: "convert_xlsx.py — Clean CSV",
    desc: "Normalises Status_Disposition capitalisation, converts dates to ISO 8601, strips whitespace, generates slugs for the ~190 cases missing a Case_snug.",
  },
  {
    step: "3",
    color: "bg-violet-500",
    title: "seed_from_excel.py — Graph Seeding",
    desc: "Loads the clean CSVs and writes Case, Docket, Document, SecondarySource, LegalTheory, and Court nodes to Neo4j using MERGE (idempotent — safe to re-run).",
  },
  {
    step: "4",
    color: "bg-sky-500",
    title: "entity_extractor.py — AI Enrichment",
    desc: "Gemini 2.5 Flash reads the Organizations_involved free-text field and extracts typed Organization and AISystem entities with confidence scores. ≥0.85 auto-approved; 0.70–0.84 queued for human review.",
  },
  {
    step: "5",
    color: "bg-emerald-500",
    title: "Live Graph — Queryable",
    desc: "382 cases, 546 organisations, 177 AI systems, 164 legal theories, 3,732 relationships. Traversable in Cypher or via natural language through the Research Navigator.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────
export default function DataPipeline() {
  const [activeStep, setActiveStep] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Architecture & Data Pipeline</h2>
        <p className="text-slate-400 text-sm mt-1">
          How 375 Excel rows become 3,732 graph relationships — and why that matters.
        </p>
      </div>

      {/* ── Section 1: Full architecture ── */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">System Architecture</h3>
        <p className="text-sm text-slate-400">
          Five layers from raw data to interactive research interface. Every arrow is a real
          code boundary — not a diagram shortcut.
        </p>
        <ArchDiagram />
      </section>

      {/* ── Section 2: Pipeline steps ── */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Data Pipeline — Step by Step</h3>
        <p className="text-sm text-slate-400">
          Click a step to see what happens at that stage.
        </p>
        <div className="relative">
          {/* Vertical connector */}
          <div className="absolute left-5 top-6 bottom-6 w-px bg-slate-600" />
          <div className="space-y-3">
            {PIPELINE_STEPS.map((s) => (
              <button
                key={s.step}
                onClick={() => setActiveStep(activeStep === s.step ? null : s.step)}
                className={`w-full flex items-start gap-4 text-left rounded-lg p-3 transition-colors ${
                  activeStep === s.step
                    ? "bg-slate-700 ring-1 ring-slate-500"
                    : "hover:bg-slate-750"
                }`}
              >
                <span
                  className={`${s.color} text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10`}
                >
                  {s.step}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{s.title}</p>
                  {activeStep === s.step && (
                    <p className="text-slate-300 text-sm mt-1 leading-relaxed">{s.desc}</p>
                  )}
                </div>
                <span className="text-slate-500 text-xs shrink-0 mt-1">
                  {activeStep === s.step ? "▲" : "▼"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Before / After transformation ── */}
      <section className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Before & After: One Case in the Flat File vs. the Graph
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Example:{" "}
              <span className="font-mono text-slate-300">ACLU v. Clearview AI, Inc.</span>
            </p>
          </div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
          >
            {showRaw ? "Show Graph View" : "Show Raw CSV"}
          </button>
        </div>

        {/* Raw CSV view */}
        {showRaw && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-900 text-amber-200 uppercase tracking-wide">
                Raw CSV — as it exists on disk
              </span>
              <span className="text-xs text-slate-500">Header row + 1 data row — 38 columns total</span>
            </div>
            <div className="bg-slate-950 rounded-lg border border-slate-700 overflow-x-auto">
              <pre className="text-[11px] font-mono text-slate-400 p-4 whitespace-pre leading-relaxed">
{`Caption,Case_Number,Organizations_involved,Cause_of_Action_Text,Name_of_Algorithm_Text,Jurisdiction_Filed,Status_Disposition,Date_Action_Filed,Area_of_Application_Text,Summary_of_Significance,...

`}<span className="text-white">"ACLU v. Clearview AI, Inc."</span>{`,2,`}<span className="text-amber-300">"ACLU; Clearview AI, Inc."</span>{`,`}<span className="text-violet-300">"BIPA, Privacy"</span>{`,`}<span className="text-sky-300">"Clearview Facial Recognition"</span>{`,`}<span className="text-emerald-300">"N.D. Ill."</span>{`,active,05/28/2020,`}<span className="text-rose-300">"Facial Recognition"</span>{`,"First major BIPA suit against facial recognition AI",...`}
              </pre>
            </div>
            <div className="bg-red-950 border border-red-800 rounded p-3 text-xs text-red-200 space-y-1">
              <p className="font-semibold text-red-100">Problems with this format:</p>
              <p>✗ <span className="font-mono text-amber-300">Organizations_involved</span> is a semicolon-separated string — not a relationship</p>
              <p>✗ <span className="font-mono text-violet-300">Cause_of_Action_Text</span> mixes multiple legal theories into one cell</p>
              <p>✗ <span className="font-mono text-sky-300">Name_of_Algorithm_Text</span> is free-text — no typed AI system entity</p>
              <p>✗ No way to query "all cases where Clearview AI is defendant" without a full table scan</p>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-start ${showRaw ? "hidden" : ""}`}>
          {/* Left — Excel / CSV row */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-900 text-amber-200 uppercase tracking-wide">
                Excel Source
              </span>
              <span className="text-xs text-slate-500">Flat · 1 row · all data collapsed into columns</span>
            </div>
            <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="text-left px-3 py-2 text-slate-300 font-mono font-semibold w-1/2">
                      Column
                    </th>
                    <th className="text-left px-3 py-2 text-slate-300 font-mono font-semibold">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EXCEL_ROW.map((r, i) => (
                    <tr
                      key={r.col}
                      className={`border-t border-slate-700 ${i % 2 === 0 ? "bg-slate-900" : "bg-slate-800"}`}
                    >
                      <td className="px-3 py-1.5 font-mono text-slate-500 text-[11px]">
                        {r.col}
                      </td>
                      <td className={`px-3 py-1.5 font-mono ${r.highlight}`}>{r.val}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-700 bg-slate-900">
                    <td className="px-3 py-1.5 font-mono text-slate-600 text-[11px] italic">
                      + 30 more columns…
                    </td>
                    <td className="px-3 py-1.5 text-slate-600 italic">all in the same flat row</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* What's lost in flat format */}
            <div className="bg-red-950 border border-red-800 rounded p-3 text-xs text-red-200 space-y-1">
              <p className="font-semibold text-red-100">What you can't do with this flat row:</p>
              <p>✗ Find all cases sharing the same defendant across jurisdictions</p>
              <p>✗ Detect BIPA + another theory co-occurring across multiple defendants</p>
              <p>✗ Ask "which AI systems are most litigated" without manual pivot tables</p>
            </div>
          </div>

          {/* Right — Graph result */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 uppercase tracking-wide">
                Knowledge Graph
              </span>
              <span className="text-xs text-slate-500">
                1 case → 6 nodes → 6 typed relationships
              </span>
            </div>
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
              <MiniGraph />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              {[
                { color: "bg-white", label: "Case" },
                { color: "bg-amber-400", label: "Organization" },
                { color: "bg-violet-400", label: "LegalTheory" },
                { color: "bg-sky-400", label: "AISystem" },
                { color: "bg-emerald-400", label: "Court" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${l.color} shrink-0`} />
                  <span className="text-slate-400 font-mono">{l.label}</span>
                </div>
              ))}
            </div>

            {/* What's now possible */}
            <div className="bg-emerald-950 border border-emerald-800 rounded p-3 text-xs text-emerald-200 space-y-1">
              <p className="font-semibold text-emerald-100">What you can now query:</p>
              <p>✓ All defendants connected to BIPA across all cases</p>
              <p>✓ Cases where the same AI system appears in multiple jurisdictions</p>
              <p>✓ Two-hop: organizations sued under both BIPA and copyright</p>
            </div>
          </div>
        </div>

        {/* Transformation arrow */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-slate-700" />
          <div className="text-center text-xs text-slate-500 px-3">
            <p className="font-semibold text-slate-300">The transformation in one sentence:</p>
            <p className="mt-0.5">
              A flat row where "Organizations_involved" is a comma-separated text string becomes{" "}
              <span className="font-mono text-amber-300">(:Organization)</span> nodes with typed{" "}
              <span className="font-mono text-slate-300">[:NAMED_DEFENDANT]</span> relationships —
              making every defendant a first-class queryable entity.
            </p>
          </div>
          <div className="flex-1 h-px bg-slate-700" />
        </div>
      </section>

      {/* ── Section 4: Graph stats ── */}
      <section>
        <h3 className="text-base font-semibold text-slate-300 mb-3">Final Graph State (Seeded Database)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: "Cases", val: "382", color: "text-white" },
            { label: "Organizations", val: "546", color: "text-amber-300" },
            { label: "AI Systems", val: "177", color: "text-sky-300" },
            { label: "Legal Theories", val: "164", color: "text-violet-300" },
            { label: "Courts", val: "149", color: "text-emerald-300" },
            { label: "Documents", val: "794", color: "text-slate-300" },
            { label: "Secondary Sources", val: "347", color: "text-slate-300" },
            { label: "Relationships", val: "3,732", color: "text-rose-300" },
            { label: "Auto-approved AI extractions", val: "476", color: "text-indigo-300" },
            { label: "Queued for human review", val: "5", color: "text-orange-300" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
