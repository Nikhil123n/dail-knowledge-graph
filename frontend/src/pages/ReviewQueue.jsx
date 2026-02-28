import { useState, useEffect } from "react";
import { fetchReviewQueue, fetchReviewStats, approveItem, rejectItem } from "../api.js";

function ConfidenceBadge({ conf }) {
  const pct = Math.round((conf ?? 0) * 100);
  const color = pct >= 85 ? "text-emerald-400" : pct >= 70 ? "text-amber-400" : "text-rose-400";
  return <span className={`font-mono text-sm ${color}`}>{pct}%</span>;
}

function ReviewCard({ item, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false);
  const [correction, setCorrection] = useState("{}");
  const payload =
    typeof item.payload === "object" ? item.payload : JSON.parse(item.payload || "{}");

  return (
    <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-slate-500 uppercase mb-1">{item.type}</div>
          <h3 className="text-white text-sm font-medium">{item.caseCaption || item.caseId}</h3>
        </div>
        <ConfidenceBadge conf={item.confidence} />
      </div>

      <div className="bg-slate-900 rounded p-3 mb-4 text-xs font-mono text-slate-300 overflow-x-auto">
        {JSON.stringify(payload, null, 2)}
      </div>

      {item.rawText && (
        <div className="text-xs text-slate-500 mb-3 italic truncate">
          Source: "{item.rawText.slice(0, 120)}..."
        </div>
      )}

      {!rejecting ? (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(item.id)}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-medium"
          >
            Approve
          </button>
          <button
            onClick={() => setRejecting(true)}
            className="bg-rose-900/50 hover:bg-rose-900 text-rose-300 px-4 py-1.5 rounded text-xs font-medium border border-rose-700"
          >
            Reject & Correct
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            rows={3}
            className="w-full bg-slate-700 text-slate-200 text-xs font-mono rounded px-3 py-2 focus:outline-none"
            placeholder='{"name": "corrected name", "canonicalName": "canonical"}'
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                try {
                  onReject(item.id, JSON.parse(correction));
                } catch {
                  alert("Invalid JSON correction");
                }
              }}
              className="bg-rose-700 hover:bg-rose-600 text-white px-4 py-1.5 rounded text-xs font-medium"
            >
              Submit Rejection
            </button>
            <button
              onClick={() => setRejecting(false)}
              className="text-slate-400 hover:text-slate-200 px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = typeFilter ? { type: typeFilter } : {};
    const [queue, s] = await Promise.all([fetchReviewQueue(params), fetchReviewStats()]);
    setItems(queue);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [typeFilter]);

  const handleApprove = async (id) => {
    await approveItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setStats((s) => s ? { ...s, pending: s.pending - 1, approved: s.approved + 1 } : s);
  };

  const handleReject = async (id, correction) => {
    await rejectItem(id, correction);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setStats((s) => s ? { ...s, pending: s.pending - 1, rejected: s.rejected + 1 } : s);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Human Review Queue</h2>
        <p className="text-slate-400 text-sm mt-1">
          Review low-confidence AI extractions before they enter the knowledge graph.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
            <div className="text-xs text-slate-400 mt-1">Pending</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.approved}</div>
            <div className="text-xs text-slate-400 mt-1">Approved</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-rose-400">{stats.rejected}</div>
            <div className="text-xs text-slate-400 mt-1">Rejected</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-slate-300">
              {Math.round((stats.avgConfidence || 0) * 100)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">Avg Confidence</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["", "entity", "classification", "ai_system"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              typeFilter === t
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {t || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse">Loading review queue...</div>
      ) : items.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400 text-sm">
          No pending review items. All caught up!
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-slate-400 text-sm">
            {items.length} item{items.length !== 1 ? "s" : ""} pending review (lowest confidence first)
          </div>
          {items.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
