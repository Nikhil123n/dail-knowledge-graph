import { useState } from "react";
import { search } from "../api.js";

const EXAMPLE_QUESTIONS = [
  "Which organizations have been sued in more than 3 AI cases?",
  "Show me all facial recognition cases filed in federal courts.",
  "Which AI systems appear in employment discrimination lawsuits?",
  "Find class action cases involving generative AI filed after 2022.",
  "What legal theories are most common in autonomous vehicle litigation?",
  "Which cases involve both copyright infringement and AI training data?",
];

function ResultRow({ row, index }) {
  const entries = Object.entries(row);
  return (
    <tr className={index % 2 === 0 ? "bg-slate-800" : "bg-slate-750"}>
      {entries.map(([k, v]) => (
        <td key={k} className="px-3 py-2 text-sm text-slate-300 border-b border-slate-700">
          {Array.isArray(v) ? v.join(", ") : String(v ?? "")}
        </td>
      ))}
    </tr>
  );
}

export default function ResearchNavigator() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (q) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await search(query);
      setResult(data);
      setQuestion(query);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const columns = result?.results?.[0] ? Object.keys(result.results[0]) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Research Navigator</h2>
        <p className="text-slate-400 text-sm mt-1">
          Direction 5 — Ask questions in plain English. Claude translates to Cypher and narrates results.
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-slate-800 rounded-lg p-5">
        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ask a research question about AI litigation..."
            className="flex-1 bg-slate-700 text-white placeholder-slate-400 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {/* Example questions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSearch(q)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-full transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-900/40 border border-rose-700 text-rose-300 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-slate-400 text-sm animate-pulse">
          Translating to Cypher and querying the graph...
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Narrative */}
          <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-5">
            <h3 className="text-indigo-400 font-semibold mb-2 text-sm uppercase tracking-wide">
              Research Narrative
            </h3>
            <p className="text-slate-200 leading-relaxed text-sm">{result.narrative}</p>
            <div className="mt-2 text-xs text-slate-500">
              Processed in {result.processingTimeMs}ms
            </div>
          </div>

          {/* Cypher explainability */}
          <details className="bg-slate-800 rounded-lg p-4 group">
            <summary className="text-slate-400 text-sm cursor-pointer hover:text-slate-300 font-medium">
              Cypher Query Explainability Panel
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Explanation</div>
                <p className="text-slate-300 text-sm">{result.cypherExplanation}</p>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Generated Cypher</div>
                <pre className="bg-slate-900 text-emerald-400 text-xs p-3 rounded-md overflow-x-auto">
                  {result.cypher}
                </pre>
              </div>
            </div>
          </details>

          {/* Results table */}
          {result.results.length > 0 ? (
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  Results ({result.results.length})
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wide"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((row, i) => (
                      <ResultRow key={i} row={row} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-6 text-center text-slate-400 text-sm">
              No results found for this query. Try broadening your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
