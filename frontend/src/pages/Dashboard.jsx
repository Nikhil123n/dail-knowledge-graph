import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchOverview, fetchTopDefendants, fetchTopAISystems, triggerIngest } from "../api.js";

function StatCard({ label, value, color = "indigo" }) {
  const colors = {
    indigo: "border-indigo-500 text-indigo-400",
    emerald: "border-emerald-500 text-emerald-400",
    amber: "border-amber-500 text-amber-400",
    rose: "border-rose-500 text-rose-400",
    cyan: "border-cyan-500 text-cyan-400",
    violet: "border-violet-500 text-violet-400",
  };
  return (
    <div className={`bg-slate-800 rounded-lg p-4 border-l-4 ${colors[color]}`}>
      <div className={`text-3xl font-bold ${colors[color].split(" ")[1]}`}>
        {value?.toLocaleString() ?? "—"}
      </div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [defendants, setDefendants] = useState([]);
  const [aiSystems, setAiSystems] = useState([]);
  const [ingestStatus, setIngestStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchOverview(),
      fetchTopDefendants(10),
      fetchTopAISystems(8),
    ])
      .then(([ov, defs, sys]) => {
        setOverview(ov);
        setDefendants(defs);
        setAiSystems(sys);
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
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading graph statistics...
      </div>
    );
  }

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
        <StatCard label="Cases" value={overview?.cases} color="indigo" />
        <StatCard label="Organizations" value={overview?.organizations} color="emerald" />
        <StatCard label="AI Systems" value={overview?.aiSystems} color="cyan" />
        <StatCard label="Legal Theories" value={overview?.legalTheories} color="amber" />
        <StatCard label="Courts" value={overview?.courts} color="rose" />
        <StatCard label="Relationships" value={overview?.relationships} color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top defendants */}
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">Top Defendants by Case Count</h3>
          <div className="space-y-2">
            {defendants.map((d, i) => (
              <div
                key={d.canonicalName}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-sm w-5">{i + 1}.</span>
                  <Link
                    to={`/graph?defendant=${encodeURIComponent(d.canonicalName)}`}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium truncate max-w-48"
                  >
                    {d.canonicalName}
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-400">{d.activeCount} active</span>
                  <span className="text-slate-400">{d.inactiveCount} inactive</span>
                  <span className="text-white font-semibold">{d.caseCount}</span>
                </div>
              </div>
            ))}
            {defendants.length === 0 && (
              <p className="text-slate-500 text-sm">
                No defendant data yet. Run demo seed or entity extraction.
              </p>
            )}
          </div>
        </div>

        {/* Top AI systems */}
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">AI Systems in Litigation</h3>
          <div className="space-y-2">
            {aiSystems.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-sm w-5">{i + 1}.</span>
                  <span className="text-slate-200 text-sm font-medium">{s.name}</span>
                  {s.category && (
                    <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
                      {s.category}
                    </span>
                  )}
                </div>
                <span className="text-cyan-400 font-semibold text-sm">{s.caseCount}</span>
              </div>
            ))}
            {aiSystems.length === 0 && (
              <p className="text-slate-500 text-sm">
                No AI system data yet. Run entity extraction.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/search"
          className="bg-slate-800 hover:bg-slate-700 rounded-lg p-5 block transition-colors"
        >
          <div className="text-indigo-400 text-lg mb-1">Research Navigator →</div>
          <p className="text-slate-400 text-sm">
            Ask natural language questions and get Cypher-powered answers with narrative explanations.
          </p>
        </Link>
        <Link
          to="/waves"
          className="bg-slate-800 hover:bg-slate-700 rounded-lg p-5 block transition-colors"
        >
          <div className="text-amber-400 text-lg mb-1">Wave Detector →</div>
          <p className="text-slate-400 text-sm">
            Identify coordinated litigation campaigns by detecting clusters of recent filings.
          </p>
        </Link>
        <Link
          to="/review"
          className="bg-slate-800 hover:bg-slate-700 rounded-lg p-5 block transition-colors"
        >
          <div className="text-emerald-400 text-lg mb-1">Review Queue →</div>
          <p className="text-slate-400 text-sm">
            Human-in-the-loop review of low-confidence AI extractions before they enter the graph.
          </p>
        </Link>
      </div>
    </div>
  );
}
