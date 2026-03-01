import { useState, useEffect } from "react";
import { fetchWaves, fetchIngestHistory, triggerIngest } from "../api.js";

function WaveCard({ wave }) {
  return (
    <div className="bg-slate-800 rounded-lg p-5 border-l-4 border-amber-500">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">{wave.defendant}</h3>
          <div className="text-amber-400 text-sm mt-0.5">
            {wave.caseCount} cases in detection window
          </div>
        </div>
        <span className="bg-amber-900/50 text-amber-300 text-xs px-2 py-1 rounded-full font-medium">
          WAVE DETECTED
        </span>
      </div>

      {wave.narrative && (
        <p className="text-slate-300 text-sm leading-relaxed mb-3">{wave.narrative}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {wave.theories.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase mb-1">Legal Theories</div>
            <div className="flex flex-wrap gap-1">
              {wave.theories.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {wave.jurisdictions.length > 0 && (
          <div>
            <div className="text-xs text-slate-500 uppercase mb-1">Jurisdictions</div>
            <div className="flex flex-wrap gap-1">
              {wave.jurisdictions.slice(0, 4).map((j) => (
                <span
                  key={j}
                  className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full"
                >
                  {j}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WaveDetector() {
  const [waves, setWaves] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(90);
  const [threshold, setThreshold] = useState(3);
  const [ingestMsg, setIngestMsg] = useState(null);

  const loadWaves = async (days, thresh) => {
    setLoading(true);
    try {
      const w = await fetchWaves({ window_days: days, threshold: thresh });
      setWaves(w);
    } finally {
      setLoading(false);
    }
  };

  // Load ingest history once on mount
  useEffect(() => {
    fetchIngestHistory().then(setHistory);
  }, []);

  // Re-run wave detection whenever window or threshold changes
  useEffect(() => {
    loadWaves(windowDays, threshold);
  }, [windowDays, threshold]);

  const loadData = () => loadWaves(windowDays, threshold);

  const handleIngest = async () => {
    setIngestMsg("Triggering ingestion...");
    try {
      await triggerIngest();
      setIngestMsg("Ingest started in background. Refresh in a few minutes.");
    } catch {
      setIngestMsg("Error triggering ingest.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Litigation Wave Detector</h2>
          <p className="text-slate-400 text-sm mt-1">
            Direction 4 — Detect coordinated litigation campaigns targeting the same defendant.
          </p>
        </div>
        <button
          onClick={handleIngest}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Trigger CourtListener Ingest
        </button>
      </div>

      {ingestMsg && (
        <div className="bg-slate-700 text-slate-200 px-4 py-2 rounded-md text-sm">{ingestMsg}</div>
      )}

      {/* Controls */}
      <div className="bg-slate-800 rounded-lg p-4 flex gap-6 items-end flex-wrap">
        <div>
          <label className="block text-xs text-slate-400 uppercase mb-1">Window (days)</label>
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>365 days</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase mb-1">Min cases (threshold)</label>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm"
          >
            <option value={2}>2+</option>
            <option value={3}>3+</option>
            <option value={5}>5+</option>
            <option value={10}>10+</option>
          </select>
        </div>
        {loading && (
          <span className="text-slate-400 text-sm animate-pulse pb-1.5">Detecting...</span>
        )}
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse">Running wave detection...</div>
      ) : waves.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <div className="text-slate-400 text-sm">
            No litigation waves detected with current parameters.
            <br />
            Try lowering the threshold or increasing the window, or seed more case data.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-slate-400 text-sm">
            {waves.length} wave{waves.length !== 1 ? "s" : ""} detected
          </div>
          {waves.map((wave) => (
            <WaveCard key={wave.defendant} wave={wave} />
          ))}
        </div>
      )}

      {/* Ingest history */}
      {history.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4 text-sm">Ingest Run History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase">
                  <th className="text-left py-2 pr-4">Timestamp</th>
                  <th className="text-right py-2 pr-4">Found</th>
                  <th className="text-right py-2 pr-4">Added</th>
                  <th className="text-right py-2">Queued</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run, i) => (
                  <tr key={i} className="border-t border-slate-700">
                    <td className="py-2 pr-4 text-slate-300">{run.timestamp}</td>
                    <td className="py-2 pr-4 text-right text-slate-300">{run.casesFound}</td>
                    <td className="py-2 pr-4 text-right text-emerald-400">{run.casesAdded}</td>
                    <td className="py-2 text-right text-amber-400">{run.casesQueued}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
