import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  fetchOverview,
  fetchTopDefendants,
  fetchTopAISystems,
  fetchCasesByYear,
  triggerIngest,
} from "../api.js";

// ── Animated count-up hook ────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

// ── Stat card with count-up ───────────────────────────────────────────────────
const STAT_STYLES = {
  indigo: { border: "border-indigo-500", text: "text-indigo-400", glow: "shadow-indigo-500/20" },
  emerald: { border: "border-emerald-500", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
  cyan: { border: "border-cyan-500", text: "text-cyan-400", glow: "shadow-cyan-500/20" },
  amber: { border: "border-amber-500", text: "text-amberald-400", glow: "shadow-amber-500/20" },
  rose: { border: "border-rose-500", text: "text-rose-400", glow: "shadow-rose-500/20" },
  violet: { border: "border-violet-500", text: "text-violet-400", glow: "shadow-violet-500/20" },
};

function StatCard({ label, value, color = "indigo" }) {
  const animated = useCountUp(value);
  const s = STAT_STYLES[color];
  return (
    <div
      className={`bg-slate-800 rounded-xl p-4 border-l-4 ${s.border} shadow-lg ${s.glow} transition-all hover:scale-[1.02]`}
    >
      <div className={`text-3xl font-bold tabular-nums ${s.text}`}>
        {value != null ? animated.toLocaleString() : "—"}
      </div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
    </div>
  );
}

// ── Category colours for AI systems ──────────────────────────────────────────
const CATEGORY_COLORS = {
  LLM:          { bar: "bg-cyan-500",    badge: "bg-cyan-900/60 text-cyan-300" },
  biometric:    { bar: "bg-rose-500",    badge: "bg-rose-900/60 text-rose-300" },
  autonomous:   { bar: "bg-violet-500",  badge: "bg-violet-900/60 text-violet-300" },
  recommender:  { bar: "bg-amber-500",   badge: "bg-amber-900/60 text-amber-300" },
  classifier:   { bar: "bg-emerald-500", badge: "bg-emerald-900/60 text-emerald-300" },
  other:        { bar: "bg-slate-500",   badge: "bg-slate-700 text-slate-300" },
};
function catStyle(cat) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other;
}

// ── Filing-trend bar chart (pure SVG, no D3) ─────────────────────────────────
function TrendChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map((d) => d.count));
  const BAR_W = 36;
  const GAP = 10;
  const H = 100;
  const LABEL_H = 20;
  const totalW = data.length * (BAR_W + GAP) - GAP;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${H + LABEL_H}`}
      className="w-full"
      style={{ height: H + LABEL_H + 8 }}
    >
      {data.map((d, i) => {
        const barH = Math.max(4, Math.round((d.count / maxCount) * H));
        const x = i * (BAR_W + GAP);
        const y = H - barH;
        const isLast = i === data.length - 1;
        return (
          <g key={d.year}>
            {/* bar */}
            <rect
              x={x}
              y={y}
              width={BAR_W}
              height={barH}
              rx={4}
              className={isLast ? "fill-indigo-400" : "fill-indigo-600"}
              opacity={0.85 + (i / data.length) * 0.15}
            />
            {/* count label on bar */}
            {barH > 18 && (
              <text
                x={x + BAR_W / 2}
                y={y + 14}
                textAnchor="middle"
                fontSize={10}
                fill="white"
                fontWeight="600"
              >
                {d.count}
              </text>
            )}
            {/* year label below */}
            <text
              x={x + BAR_W / 2}
              y={H + LABEL_H}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {d.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [defendants, setDefendants] = useState([]);
  const [aiSystems, setAiSystems] = useState([]);
  const [yearData, setYearData] = useState([]);
  const [ingestStatus, setIngestStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchOverview(),
      fetchTopDefendants(10),
      fetchTopAISystems(8),
      fetchCasesByYear(),
    ])
      .then(([ov, defs, sys, yr]) => {
        setOverview(ov);
        setDefendants(defs);
        setAiSystems(sys);
        setYearData(yr);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleIngest = async () => {
    setIngestStatus("running");
    try {
      const result = await triggerIngest();
      setIngestStatus(`Started: ${result.message || "OK"}`);
    } catch {
      setIngestStatus("Error triggering ingest.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 animate-pulse">
        Loading graph statistics...
      </div>
    );
  }

  const maxDefCases = defendants[0]?.caseCount ?? 1;
  const maxSysCases = aiSystems[0]?.caseCount ?? 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Graph Overview</h2>
          <p className="text-slate-400 text-sm mt-1">
            AI Litigation Knowledge Graph — Direction 1: Defendant Influence Map
          </p>
        </div>
        <button
          onClick={handleIngest}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Trigger Ingest
        </button>
      </div>

      {ingestStatus && (
        <div className="bg-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm">
          {ingestStatus}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Cases"          value={overview?.cases}         color="indigo" />
        <StatCard label="Organizations"  value={overview?.organizations} color="emerald" />
        <StatCard label="AI Systems"     value={overview?.aiSystems}     color="cyan" />
        <StatCard label="Legal Theories" value={overview?.legalTheories} color="amber" />
        <StatCard label="Courts"         value={overview?.courts}        color="rose" />
        <StatCard label="Relationships"  value={overview?.relationships} color="violet" />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top defendants with stacked bar */}
        <div className="bg-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Top Defendants by Case Count</h3>
          <div className="space-y-3">
            {defendants.map((d, i) => {
              const activePct  = (d.activeCount  / maxDefCases) * 100;
              const inactivePct = (d.inactiveCount / maxDefCases) * 100;
              return (
                <div key={d.canonicalName}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}.</span>
                      <Link
                        to={`/graph?defendant=${encodeURIComponent(d.canonicalName)}`}
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium truncate max-w-44"
                      >
                        {d.canonicalName}
                      </Link>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="bg-emerald-900/60 text-emerald-300 text-xs px-1.5 py-0.5 rounded">
                        {d.activeCount} active
                      </span>
                      <span className="bg-slate-700 text-slate-400 text-xs px-1.5 py-0.5 rounded">
                        {d.inactiveCount} inactive
                      </span>
                      <span className="bg-indigo-900/60 text-indigo-300 text-xs px-1.5 py-0.5 rounded font-semibold tabular-nums">
                        {d.caseCount} total
                      </span>
                    </div>
                  </div>
                  {/* Stacked bar */}
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-700"
                      style={{ width: `${activePct}%` }}
                    />
                    <div
                      className="bg-slate-500 h-full transition-all duration-700"
                      style={{ width: `${inactivePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {defendants.length === 0 && (
              <p className="text-slate-500 text-sm">No defendant data yet.</p>
            )}
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-slate-700">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Active
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Inactive
            </span>
          </div>
        </div>

        {/* AI systems with category-colored bars */}
        <div className="bg-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">AI Systems in Litigation</h3>
          <div className="space-y-3">
            {aiSystems.map((s, i) => {
              const pct = (s.caseCount / maxSysCases) * 100;
              const cs = catStyle(s.category);
              return (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-500 text-xs w-4 shrink-0">{i + 1}.</span>
                      <span className="text-slate-200 text-sm font-medium truncate">{s.name}</span>
                      {s.category && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${cs.badge}`}>
                          {s.category}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-300 font-bold text-sm shrink-0 ml-2">
                      {s.caseCount}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${cs.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {aiSystems.length === 0 && (
              <p className="text-slate-500 text-sm">No AI system data yet.</p>
            )}
          </div>
          {/* Category legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-700">
            {Object.entries(CATEGORY_COLORS)
              .filter(([k]) => k !== "other")
              .map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={`w-2 h-2 rounded-full inline-block ${v.bar}`} />
                  {k}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Filing trend chart */}
      {yearData.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">AI Litigation Filing Trend</h3>
            <span className="text-xs text-slate-400">Cases filed per year · 2016 – present</span>
          </div>
          <TrendChart data={yearData} />
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/search"
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-5 block transition-all hover:shadow-lg hover:shadow-indigo-500/10 group"
        >
          <div className="text-indigo-400 text-base font-semibold mb-1 group-hover:text-indigo-300 flex items-center gap-2">
            Research Navigator
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
          <p className="text-slate-400 text-sm">
            Ask natural language questions and get Cypher-powered answers with narrative explanations.
          </p>
        </Link>
        <Link
          to="/waves"
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 rounded-xl p-5 block transition-all hover:shadow-lg hover:shadow-amber-500/10 group"
        >
          <div className="text-amber-400 text-base font-semibold mb-1 group-hover:text-amber-300 flex items-center gap-2">
            Wave Detector
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
          <p className="text-slate-400 text-sm">
            Identify coordinated litigation campaigns by detecting clusters of recent filings.
          </p>
        </Link>
        <Link
          to="/review"
          className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 block transition-all hover:shadow-lg hover:shadow-emerald-500/10 group"
        >
          <div className="text-emerald-400 text-base font-semibold mb-1 group-hover:text-emerald-300 flex items-center gap-2">
            Review Queue
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
          <p className="text-slate-400 text-sm">
            Human-in-the-loop review of low-confidence AI extractions before they enter the graph.
          </p>
        </Link>
      </div>
    </div>
  );
}
