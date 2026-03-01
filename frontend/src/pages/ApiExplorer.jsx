import { useState } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Endpoint catalogue ────────────────────────────────────────────────────
const GROUPS = [
  {
    name: "Graph",
    color: "violet",
    endpoints: [
      {
        id: "graph-overview",
        method: "GET",
        path: "/api/v1/graph/overview",
        description: "Node and relationship counts across the full knowledge graph.",
        params: [],
      },
      {
        id: "graph-defendants",
        method: "GET",
        path: "/api/v1/graph/defendants",
        description: "Top defendants ranked by number of cases filed against them.",
        params: [{ name: "limit", type: "query", default: "20", placeholder: "20" }],
      },
      {
        id: "graph-defendant-cases",
        method: "GET",
        path: "/api/v1/graph/defendants/{org}/cases",
        description: "All cases in which a specific organization appears as a defendant.",
        params: [{ name: "org", type: "path", default: "", placeholder: "e.g. Clearview AI" }],
      },
      {
        id: "graph-orgs-search",
        method: "GET",
        path: "/api/v1/graph/orgs/search",
        description: "Search organizations by partial name match, ranked by case count.",
        params: [
          { name: "q", type: "query", default: "", placeholder: "e.g. openai" },
          { name: "limit", type: "query", default: "20", placeholder: "20" },
        ],
      },
      {
        id: "graph-cases-by-year",
        method: "GET",
        path: "/api/v1/graph/cases-by-year",
        description: "Case counts grouped by filing year (2016 to present) — powers the filing trend chart.",
        params: [],
      },
      {
        id: "graph-ai-systems",
        method: "GET",
        path: "/api/v1/graph/ai-systems",
        description: "Top AI systems by case count.",
        params: [{ name: "limit", type: "query", default: "15", placeholder: "15" }],
      },
      {
        id: "graph-theory-cases",
        method: "GET",
        path: "/api/v1/graph/theories/{theory}/cases",
        description: "All cases asserting a specific legal theory.",
        params: [{ name: "theory", type: "path", default: "", placeholder: "e.g. BIPA" }],
      },
    ],
  },
  {
    name: "Cases",
    color: "sky",
    endpoints: [
      {
        id: "cases-list",
        method: "GET",
        path: "/api/v1/cases/",
        description: "Paginated list of all cases with optional filters.",
        params: [
          { name: "limit", type: "query", default: "10", placeholder: "10" },
          { name: "skip", type: "query", default: "0", placeholder: "0" },
          { name: "status", type: "query", default: "", placeholder: "e.g. Active" },
          { name: "jurisdiction", type: "query", default: "", placeholder: "e.g. N.D. Cal." },
        ],
      },
      {
        id: "cases-detail",
        method: "GET",
        path: "/api/v1/cases/{id}",
        description: "Full detail for a single case including all properties.",
        params: [{ name: "id", type: "path", default: "", placeholder: "case slug" }],
      },
      {
        id: "cases-neighbors",
        method: "GET",
        path: "/api/v1/cases/{id}/neighbors",
        description: "Graph neighborhood: organizations, AI systems, legal theories, and courts connected to a case.",
        params: [{ name: "id", type: "path", default: "", placeholder: "case slug" }],
      },
      {
        id: "cases-similar",
        method: "GET",
        path: "/api/v1/cases/{id}/similar",
        description: "Cases that share the most relationships with a given case.",
        params: [{ name: "id", type: "path", default: "", placeholder: "case slug" }],
      },
      {
        id: "cases-secondary",
        method: "GET",
        path: "/api/v1/cases/{id}/secondary-sources",
        description: "Academic papers and news articles linked to a case.",
        params: [{ name: "id", type: "path", default: "", placeholder: "case slug" }],
      },
    ],
  },
  {
    name: "Search",
    color: "emerald",
    endpoints: [
      {
        id: "search-nl",
        method: "POST",
        path: "/api/v1/search/",
        description:
          "Natural language → Gemini → Cypher → Neo4j → narrative. Ask any research question in plain English.",
        params: [],
        body: '{\n  "question": "Which organizations face the most BIPA claims in Illinois?"\n}',
      },
    ],
  },
  {
    name: "Ingest",
    color: "amber",
    endpoints: [
      {
        id: "ingest-waves",
        method: "GET",
        path: "/api/v1/ingest/waves",
        description: "Detect litigation waves — defendants with ≥ threshold cases within window_days.",
        params: [
          { name: "window_days", type: "query", default: "90", placeholder: "90" },
          { name: "threshold", type: "query", default: "3", placeholder: "3" },
        ],
      },
      {
        id: "ingest-history",
        method: "GET",
        path: "/api/v1/ingest/history",
        description: "Last 10 CourtListener ingestion run audit records.",
        params: [],
      },
      {
        id: "ingest-staged",
        method: "GET",
        path: "/api/v1/ingest/staged",
        description: "Cases ingested from CourtListener awaiting human review.",
        params: [],
      },
      {
        id: "ingest-trigger",
        method: "POST",
        path: "/api/v1/ingest/trigger",
        description: "Manually trigger a CourtListener ingestion run.",
        params: [],
        body: "",
      },
    ],
  },
  {
    name: "Review",
    color: "rose",
    endpoints: [
      {
        id: "review-queue",
        method: "GET",
        path: "/api/v1/review/queue",
        description: "Pending human review items for low-confidence AI extractions.",
        params: [],
      },
      {
        id: "review-stats",
        method: "GET",
        path: "/api/v1/review/stats",
        description: "Summary statistics for the review queue.",
        params: [],
      },
      {
        id: "review-approve",
        method: "POST",
        path: "/api/v1/review/{id}/approve",
        description: "Approve a low-confidence AI extraction and write it to the graph.",
        params: [{ name: "id", type: "path", default: "", placeholder: "review item id" }],
        body: "",
      },
      {
        id: "review-reject",
        method: "POST",
        path: "/api/v1/review/{id}/reject",
        description: "Reject a low-confidence AI extraction.",
        params: [{ name: "id", type: "path", default: "", placeholder: "review item id" }],
        body: '{\n  "correction": "optional correction note"\n}',
      },
    ],
  },
];

// ─── Colour maps ───────────────────────────────────────────────────────────
const METHOD_COLORS = {
  GET: "bg-emerald-700 text-emerald-100",
  POST: "bg-blue-700 text-blue-100",
};

const GROUP_BORDER = {
  violet: "border-violet-500",
  sky: "border-sky-500",
  emerald: "border-emerald-500",
  amber: "border-amber-500",
  rose: "border-rose-500",
};

const GROUP_BADGE = {
  violet: "bg-violet-900 text-violet-200",
  sky: "bg-sky-900 text-sky-200",
  emerald: "bg-emerald-900 text-emerald-200",
  amber: "bg-amber-900 text-amber-200",
  rose: "bg-rose-900 text-rose-200",
};

// ─── JSON syntax highlighter ───────────────────────────────────────────────
function JsonView({ data }) {
  const text = JSON.stringify(data, null, 2);
  const highlighted = text.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?([eE][+-]?\d+)?)/g,
    (match) => {
      if (/^".*":$/.test(match)) return `<span class="text-sky-300">${match}</span>`;
      if (/^"/.test(match)) return `<span class="text-emerald-300">${match}</span>`;
      if (/true|false/.test(match)) return `<span class="text-amber-300">${match}</span>`;
      if (/null/.test(match)) return `<span class="text-slate-400">${match}</span>`;
      return `<span class="text-violet-300">${match}</span>`;
    }
  );
  return (
    <pre
      className="text-xs leading-relaxed font-mono overflow-auto max-h-96 p-4 bg-slate-950 rounded"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

// ─── Single endpoint card ──────────────────────────────────────────────────
function EndpointCard({ ep, groupColor }) {
  const [open, setOpen] = useState(false);
  const [paramValues, setParamValues] = useState(
    Object.fromEntries((ep.params || []).map((p) => [p.name, p.default || ""]))
  );
  const [body, setBody] = useState(ep.body || "");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);

  function buildUrl() {
    let url = BASE + ep.path;
    const queryParts = [];
    (ep.params || []).forEach((p) => {
      const val = paramValues[p.name];
      if (p.type === "path") {
        url = url.replace(`{${p.name}}`, encodeURIComponent(val || `{${p.name}}`));
      } else if (val) {
        queryParts.push(`${p.name}=${encodeURIComponent(val)}`);
      }
    });
    if (queryParts.length) url += "?" + queryParts.join("&");
    return url;
  }

  async function run() {
    setLoading(true);
    setResponse(null);
    setStatusInfo(null);
    const url = buildUrl();
    const t0 = performance.now();
    try {
      const opts = {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
      };
      if (ep.method === "POST" && body.trim()) opts.body = body;
      const res = await fetch(url, opts);
      const ms = Math.round(performance.now() - t0);
      const contentType = res.headers.get("content-type") || "";
      let data;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      setStatusInfo({ code: res.status, ms });
      setResponse(data);
    } catch (err) {
      setStatusInfo({ code: "ERR", ms: Math.round(performance.now() - t0) });
      setResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  function copyResponse() {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
  }

  const displayUrl = buildUrl();

  return (
    <div className={`border-l-2 ${GROUP_BORDER[groupColor]} bg-slate-800 rounded-r-lg`}>
      {/* Header row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors rounded-r-lg"
      >
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${METHOD_COLORS[ep.method]}`}
        >
          {ep.method}
        </span>
        <span className="font-mono text-sm text-slate-200 truncate">{ep.path}</span>
        <span className="ml-auto text-xs text-slate-400 shrink-0 hidden sm:block">
          {ep.description.slice(0, 60)}…
        </span>
        <span className="text-slate-500 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700 pt-4">
          <p className="text-sm text-slate-300">{ep.description}</p>

          {/* Parameters */}
          {ep.params && ep.params.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Parameters
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ep.params.map((p) => (
                  <div key={p.name} className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">
                      <span className="font-mono text-slate-300">{p.name}</span>
                      <span
                        className={`ml-1 text-[10px] px-1 rounded ${
                          p.type === "path"
                            ? "bg-orange-900 text-orange-300"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {p.type}
                      </span>
                    </label>
                    <input
                      className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                      value={paramValues[p.name]}
                      placeholder={p.placeholder}
                      onChange={(e) =>
                        setParamValues((v) => ({ ...v, [p.name]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body editor for POST */}
          {ep.method === "POST" && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Request Body (JSON)
              </p>
              <textarea
                rows={Math.max(3, (body.match(/\n/g) || []).length + 2)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 resize-y"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          )}

          {/* URL preview */}
          <div className="bg-slate-900 rounded px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">URL</span>
            <span className="font-mono text-xs text-slate-300 truncate">{displayUrl}</span>
          </div>

          {/* Execute button */}
          <button
            onClick={run}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {loading ? "Sending…" : `Execute  ${ep.method}`}
          </button>

          {/* Response */}
          {statusInfo && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                    String(statusInfo.code).startsWith("2")
                      ? "bg-emerald-800 text-emerald-200"
                      : "bg-red-800 text-red-200"
                  }`}
                >
                  {statusInfo.code}
                </span>
                <span className="text-xs text-slate-400">{statusInfo.ms} ms</span>
                <button
                  onClick={copyResponse}
                  className="ml-auto text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Copy JSON
                </button>
              </div>
              {typeof response === "object" ? (
                <JsonView data={response} />
              ) : (
                <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded max-h-96 overflow-auto">
                  {response}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function ApiExplorer() {
  const [openGroups, setOpenGroups] = useState(
    Object.fromEntries(GROUPS.map((g) => [g.name, true]))
  );
  const totalEndpoints = GROUPS.reduce((s, g) => s + g.endpoints.length, 0);

  function toggleGroup(name) {
    setOpenGroups((v) => ({ ...v, [name]: !v[name] }));
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">API Explorer</h2>
          <p className="text-slate-400 text-sm mt-1">
            {totalEndpoints} endpoints · Live requests against{" "}
            <span className="font-mono text-slate-300">{BASE}</span>
          </p>
        </div>
        <a
          href={`${BASE}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors font-medium"
        >
          OpenAPI Docs ↗
        </a>
      </div>

      {/* Info banner */}
      <div className="bg-indigo-950 border border-indigo-700 rounded-lg px-4 py-3 text-sm text-indigo-200">
        Click any endpoint to expand it, fill in parameters, and execute a live request against
        the running backend. All Search queries use{" "}
        <span className="font-mono text-indigo-300">Gemini 2.5 Flash</span> to translate natural
        language to Cypher in real time.
      </div>

      {/* Endpoint groups */}
      {GROUPS.map((group) => (
        <div key={group.name} className="space-y-2">
          {/* Group header */}
          <button
            onClick={() => toggleGroup(group.name)}
            className="w-full flex items-center gap-3 text-left"
          >
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${GROUP_BADGE[group.color]}`}
            >
              {group.name}
            </span>
            <span className="text-xs text-slate-500">
              {group.endpoints.length} endpoint{group.endpoints.length !== 1 ? "s" : ""}
            </span>
            <span className="ml-auto text-slate-600 text-xs">
              {openGroups[group.name] ? "▲" : "▼"}
            </span>
          </button>

          {/* Endpoint list */}
          {openGroups[group.name] && (
            <div className="space-y-1 pl-1">
              {group.endpoints.map((ep) => (
                <EndpointCard key={ep.id} ep={ep} groupColor={group.color} />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Footer note */}
      <p className="text-xs text-slate-600 text-center pb-4">
        All GET endpoints are read-only. POST /search/ is rate-limited by Gemini API quota.
        POST /ingest/trigger initiates a live CourtListener API poll.
      </p>
    </div>
  );
}
