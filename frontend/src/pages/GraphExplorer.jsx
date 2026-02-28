import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as d3 from "d3";
import {
  fetchTopDefendants,
  fetchDefendantCases,
  fetchCaseNeighbors,
  fetchCases,
} from "../api.js";

const NODE_COLORS = {
  Case: "#6366f1",
  Organization: "#10b981",
  AISystem: "#06b6d4",
  LegalTheory: "#f59e0b",
  Court: "#ec4899",
};

function ForceGraph({ nodes, links, onNodeClick }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (!nodes.length) return;
    const width = svgRef.current.clientWidth || 800;
    const height = 500;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .call(
        d3.zoom().on("zoom", (e) => {
          g.attr("transform", e.transform);
        })
      );

    const g = svg.append("g");

    const sim = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(24));

    simRef.current = sim;

    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#475569")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6);

    const linkLabel = g
      .append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("font-size", 8)
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .text((d) => d.label || "");

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_, d) => onNodeClick(d))
      .call(
        d3.drag()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append("circle")
      .attr("r", (d) => (d.type === "Case" ? 14 : 10))
      .attr("fill", (d) => NODE_COLORS[d.type] || "#94a3b8")
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    node
      .append("text")
      .attr("dy", 24)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("fill", "#cbd5e1")
      .text((d) => (d.label || "").slice(0, 20));

    sim.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      linkLabel
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [nodes, links]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-[500px] bg-slate-900 rounded-lg"
    />
  );
}

export default function GraphExplorer() {
  const [searchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [defendants, setDefendants] = useState([]);
  const [selectedDefendant, setSelectedDefendant] = useState(
    searchParams.get("defendant") || ""
  );
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTopDefendants(30).then(setDefendants);
  }, []);

  const loadDefendantGraph = useCallback(async (orgName) => {
    if (!orgName) return;
    setLoading(true);
    try {
      const cases = await fetchDefendantCases(orgName);
      const nodes = [
        { id: `org-${orgName}`, type: "Organization", label: orgName },
      ];
      const links = [];

      for (const c of cases.slice(0, 25)) {
        nodes.push({ id: c.id, type: "Case", label: c.caption, data: c });
        links.push({
          source: c.id,
          target: `org-${orgName}`,
          label: "DEFENDANT",
        });
        for (const t of (c.theories || []).slice(0, 2)) {
          const tid = `theory-${t}`;
          if (!nodes.find((n) => n.id === tid)) {
            nodes.push({ id: tid, type: "LegalTheory", label: t });
          }
          links.push({ source: c.id, target: tid, label: "CLAIMS" });
        }
      }
      setGraphData({ nodes, links });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCaseGraph = useCallback(async (caseId) => {
    setLoading(true);
    try {
      const data = await fetchCaseNeighbors(caseId);
      if (!data || !data.case) return;
      const nodes = [{ id: caseId, type: "Case", label: data.case.caption, data: data.case }];
      const links = [];

      for (const org of data.organizations || []) {
        const oid = `org-${org.name}`;
        nodes.push({ id: oid, type: "Organization", label: org.name });
        links.push({ source: caseId, target: oid, label: "DEFENDANT" });
      }
      for (const sys of data.aiSystems || []) {
        const sid = `sys-${sys.name}`;
        nodes.push({ id: sid, type: "AISystem", label: sys.name });
        links.push({ source: caseId, target: sid, label: "SYSTEM" });
      }
      for (const t of data.legalTheories || []) {
        const tid = `theory-${t}`;
        nodes.push({ id: tid, type: "LegalTheory", label: t });
        links.push({ source: caseId, target: tid, label: "CLAIMS" });
      }
      for (const ct of data.courts || []) {
        const ctid = `court-${ct}`;
        nodes.push({ id: ctid, type: "Court", label: ct });
        links.push({ source: caseId, target: ctid, label: "FILED_IN" });
      }
      setGraphData({ nodes, links });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDefendant) {
      loadDefendantGraph(selectedDefendant);
    }
  }, [selectedDefendant]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (node.type === "Case") {
      loadCaseGraph(node.id);
    } else if (node.type === "Organization") {
      const name = node.label;
      setSelectedDefendant(name);
      loadDefendantGraph(name);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Graph Explorer</h2>
        <p className="text-slate-400 text-sm mt-1">
          Direction 1 — Explore the defendant influence map. Click nodes to drill in.
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-400">{type}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar: defendant list */}
        <div className="bg-slate-800 rounded-lg p-4 space-y-1 overflow-y-auto max-h-[540px]">
          <h3 className="text-xs text-slate-400 uppercase mb-2 font-medium">Top Defendants</h3>
          {defendants.map((d) => (
            <button
              key={d.canonicalName}
              onClick={() => setSelectedDefendant(d.canonicalName)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                selectedDefendant === d.canonicalName
                  ? "bg-indigo-700 text-white"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span className="font-medium truncate block">{d.canonicalName}</span>
              <span className="text-slate-400">{d.caseCount} cases</span>
            </button>
          ))}
        </div>

        {/* Graph */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="bg-slate-900 rounded-lg h-[500px] flex items-center justify-center text-slate-400">
              Loading graph...
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="bg-slate-900 rounded-lg h-[500px] flex items-center justify-center text-slate-400">
              Select a defendant or click a case to explore the graph.
            </div>
          ) : (
            <ForceGraph
              nodes={graphData.nodes}
              links={graphData.links}
              onNodeClick={handleNodeClick}
            />
          )}

          {/* Selected node detail */}
          {selectedNode && (
            <div className="mt-3 bg-slate-800 rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase">{selectedNode.type}</span>
                  <div className="text-white font-medium mt-0.5">{selectedNode.label}</div>
                </div>
                {selectedNode.type === "Case" && (
                  <Link
                    to={`/cases/${selectedNode.id}`}
                    className="text-indigo-400 hover:text-indigo-300 text-xs"
                  >
                    View full case →
                  </Link>
                )}
              </div>
              {selectedNode.data?.status && (
                <div className="text-slate-400 text-xs mt-1">
                  Status: {selectedNode.data.status}
                  {selectedNode.data.dateFiled && ` · Filed: ${selectedNode.data.dateFiled}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
