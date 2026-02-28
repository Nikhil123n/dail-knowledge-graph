import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: `${BASE}/api/v1` });

// Graph / overview
export const fetchOverview = () => api.get("/graph/overview").then((r) => r.data);
export const fetchTopDefendants = (limit = 20) =>
  api.get("/graph/defendants", { params: { limit } }).then((r) => r.data);
export const fetchDefendantCases = (orgName) =>
  api.get(`/graph/defendants/${encodeURIComponent(orgName)}/cases`).then((r) => r.data);
export const fetchTopAISystems = (limit = 15) =>
  api.get("/graph/ai-systems", { params: { limit } }).then((r) => r.data);
export const fetchCasesByTheory = (theory) =>
  api.get(`/graph/theories/${encodeURIComponent(theory)}/cases`).then((r) => r.data);

// Cases
export const fetchCases = (params = {}) =>
  api.get("/cases/", { params }).then((r) => r.data);
export const fetchCase = (id) => api.get(`/cases/${id}`).then((r) => r.data);
export const fetchCaseNeighbors = (id) =>
  api.get(`/cases/${id}/neighbors`).then((r) => r.data);
export const fetchSimilarCases = (id) =>
  api.get(`/cases/${id}/similar`).then((r) => r.data);

// Search
export const search = (question, mode = "hybrid") =>
  api.post("/search/", { question, mode }).then((r) => r.data);

// Review
export const fetchReviewQueue = (params = {}) =>
  api.get("/review/queue", { params }).then((r) => r.data);
export const fetchReviewStats = () => api.get("/review/stats").then((r) => r.data);
export const approveItem = (id) => api.post(`/review/${id}/approve`).then((r) => r.data);
export const rejectItem = (id, correction) =>
  api.post(`/review/${id}/reject`, { correction }).then((r) => r.data);

// Ingest
export const triggerIngest = () => api.post("/ingest/trigger").then((r) => r.data);
export const fetchIngestHistory = () => api.get("/ingest/history").then((r) => r.data);
export const fetchStagedCases = () => api.get("/ingest/staged").then((r) => r.data);
export const fetchWaves = (params = {}) =>
  api.get("/ingest/waves", { params }).then((r) => r.data);
