import httpx
import logging
from app.models.graph_models import StagingCase

logger = logging.getLogger(__name__)

AI_LITIGATION_KEYWORDS = [
    "artificial intelligence",
    "machine learning",
    "algorithm",
    "facial recognition",
    "ChatGPT",
    "autonomous vehicle",
    "deepfake",
    "generative AI",
    "LLM",
    "biometric",
]


class CourtListenerClient:
    def __init__(self, base_url: str = "https://www.courtlistener.com"):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={"User-Agent": "DAIL-Research-Bot/1.0"},
        )

    async def search(self, query: str, filed_after: str, limit: int = 20) -> list:
        url = f"{self.base_url}/api/rest/v4/dockets/"
        params = {
            "q": query,
            "filed_after": filed_after,
            "order_by": "-date_filed",
            "format": "json",
            "page_size": limit,
        }
        try:
            r = await self.client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            return data.get("results", [])
        except Exception as e:
            logger.error(f"CourtListener search failed for '{query}': {e}")
            return []

    async def get_opinion_text(self, cluster_id: int) -> str:
        url = f"{self.base_url}/api/rest/v4/clusters/{cluster_id}/"
        try:
            r = await self.client.get(url, params={"format": "json"})
            r.raise_for_status()
            data = r.json()
            return data.get("plain_text", "") or data.get("html_with_citations", "")[:2000]
        except Exception:
            return ""

    def parse_to_staging(self, d: dict) -> StagingCase:
        return StagingCase(
            clSourceId=str(d.get("id", "")),
            caption=d.get("case_name", d.get("case_name_short", "Unknown")),
            courtName=d.get("court_id", ""),
            dateFiled=str(d.get("date_filed", ""))[:10] if d.get("date_filed") else None,
            docketNumber=d.get("docket_number", ""),
            absoluteUrl=d.get("absolute_url", ""),
        )

    async def aclose(self):
        await self.client.aclose()
