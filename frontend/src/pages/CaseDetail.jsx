import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCaseNeighbors, fetchSimilarCases } from "../api.js";

function Tag({ children, color = "slate" }) {
  const styles = {
    slate: "bg-slate-700 text-slate-300",
    indigo: "bg-indigo-900/50 text-indigo-300",
    amber: "bg-amber-900/50 text-amber-300",
    emerald: "bg-emerald-900/50 text-emerald-300",
    cyan: "bg-cyan-900/50 text-cyan-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[color]}`}>{children}</span>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCaseNeighbors(id), fetchSimilarCases(id)])
      .then(([neighbors, sim]) => {
        setData(neighbors);
        setSimilar(sim);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-slate-400 animate-pulse p-8">Loading case...</div>;
  }

  if (!data || !data.case) {
    return (
      <div className="text-slate-400 p-8">
        Case not found.{" "}
        <Link to="/" className="text-indigo-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const { case: c, organizations, aiSystems, legalTheories, courts } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/" className="text-indigo-400 text-sm hover:underline">
            ← Dashboard
          </Link>
          <h2 className="text-2xl font-bold text-white mt-2">{c.caption}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                c.status === "Active"
                  ? "bg-emerald-900/60 text-emerald-300"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {c.status}
            </span>
            {c.dateFiled && (
              <span className="text-slate-400 text-sm">{c.dateFiled}</span>
            )}
            {c.isClassAction === "Yes" && (
              <Tag color="amber">Class Action</Tag>
            )}
            {c.autoClassified && (
              <Tag color="indigo">AI Classified</Tag>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          {c.briefDescription && (
            <div className="bg-slate-800 rounded-lg p-5">
              <h3 className="text-slate-400 text-xs uppercase mb-2">Brief Description</h3>
              <p className="text-slate-200 text-sm leading-relaxed">{c.briefDescription}</p>
            </div>
          )}

          {c.summarySignificance && (
            <div className="bg-slate-800 rounded-lg p-5">
              <h3 className="text-slate-400 text-xs uppercase mb-2">Significance</h3>
              <p className="text-slate-200 text-sm leading-relaxed">{c.summarySignificance}</p>
            </div>
          )}

          {/* Named defendants */}
          {organizations.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-5">
              <h3 className="text-slate-400 text-xs uppercase mb-3">
                Organizations ({organizations.length})
              </h3>
              <div className="space-y-2">
                {organizations.map((org) => (
                  <div key={org.name} className="flex items-center justify-between">
                    <Link
                      to={`/graph?defendant=${encodeURIComponent(org.name)}`}
                      className="text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      {org.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {(org.roles || []).map((r) => (
                        <Tag key={r}>{r}</Tag>
                      ))}
                      {org.confidence && (
                        <span className="text-xs text-slate-500">
                          {Math.round(org.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI systems */}
          {aiSystems.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-5">
              <h3 className="text-slate-400 text-xs uppercase mb-3">
                AI Systems ({aiSystems.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {aiSystems.map((s) => (
                  <div key={s.name} className="flex items-center gap-1">
                    <Tag color="cyan">{s.name}</Tag>
                    {s.category && (
                      <span className="text-xs text-slate-500">({s.category})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4 text-sm space-y-3">
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">Jurisdiction</div>
              <div className="text-slate-200">{c.jurisdictionFiled || "—"}</div>
              {c.jurisdictionType && (
                <div className="text-slate-400 text-xs">{c.jurisdictionType}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">Source</div>
              <div className="text-slate-200">{c.source}</div>
            </div>
            {c.classificationConfidence && (
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">AI Confidence</div>
                <div className="text-slate-200">
                  {Math.round(c.classificationConfidence * 100)}%
                </div>
              </div>
            )}
          </div>

          {legalTheories.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-slate-400 text-xs uppercase mb-2">Legal Theories</h3>
              <div className="flex flex-wrap gap-1">
                {legalTheories.map((t) => (
                  <Tag key={t} color="amber">{t}</Tag>
                ))}
              </div>
            </div>
          )}

          {courts.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-slate-400 text-xs uppercase mb-2">Courts</h3>
              <div className="flex flex-wrap gap-1">
                {courts.map((ct) => (
                  <Tag key={ct}>{ct}</Tag>
                ))}
              </div>
            </div>
          )}

          {c.areaOfApplication?.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-slate-400 text-xs uppercase mb-2">Areas</h3>
              <div className="flex flex-wrap gap-1">
                {c.areaOfApplication.map((a) => (
                  <Tag key={a} color="emerald">{a}</Tag>
                ))}
              </div>
            </div>
          )}

          {/* Similar cases */}
          {similar.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-slate-400 text-xs uppercase mb-2">Similar Cases</h3>
              <div className="space-y-2">
                {similar.slice(0, 5).map((s) => (
                  <Link
                    key={s.id}
                    to={`/cases/${s.id}`}
                    className="block text-indigo-400 hover:text-indigo-300 text-xs truncate"
                  >
                    {s.caption}
                    <span className="text-slate-500 ml-1">({s.totalOverlap} shared)</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
