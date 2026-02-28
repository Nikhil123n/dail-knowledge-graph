import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import GraphExplorer from "./pages/GraphExplorer.jsx";
import ResearchNavigator from "./pages/ResearchNavigator.jsx";
import WaveDetector from "./pages/WaveDetector.jsx";
import ReviewQueue from "./pages/ReviewQueue.jsx";
import CaseDetail from "./pages/CaseDetail.jsx";
import ApiExplorer from "./pages/ApiExplorer.jsx";

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-600 text-white"
            : "text-slate-300 hover:bg-slate-700 hover:text-white"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              DAIL Living Case Graph
            </h1>
            <p className="text-xs text-slate-400">GWU Law · AI Litigation Knowledge Graph</p>
          </div>
          <nav className="flex gap-1">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/graph" label="Graph Explorer" />
            <NavItem to="/search" label="Research Navigator" />
            <NavItem to="/waves" label="Wave Detector" />
            <NavItem to="/review" label="Review Queue" />
            <NavItem to="/api" label="API Explorer" />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/graph" element={<GraphExplorer />} />
          <Route path="/search" element={<ResearchNavigator />} />
          <Route path="/waves" element={<WaveDetector />} />
          <Route path="/review" element={<ReviewQueue />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/api" element={<ApiExplorer />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-700 bg-slate-800 px-6 py-3 text-center text-xs text-slate-500">
        DAIL Living Case Graph · GWU Law · Built with Neo4j + FastAPI + Gemini
      </footer>
    </div>
  );
}
