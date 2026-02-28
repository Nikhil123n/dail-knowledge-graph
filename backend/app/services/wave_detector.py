import logging
from app.models.graph_models import WaveSignal
from app.services.neo4j_service import detect_waves_cypher
from app.services.claude_service import describe_wave

logger = logging.getLogger(__name__)


async def detect_waves(
    driver,
    api_key: str,
    window_days: int = 60,
    threshold: int = 3,
) -> list[WaveSignal]:
    raw = await detect_waves_cypher(driver, window_days=window_days, threshold=threshold)
    waves = []
    for r in raw:
        narrative = await describe_wave(
            api_key,
            r["defendant"],
            r["caseCount"],
            r.get("theories", []),
            r.get("jurisdictions", []),
        )
        waves.append(
            WaveSignal(
                defendant=r["defendant"],
                caseCount=r["caseCount"],
                theories=r.get("theories", []),
                jurisdictions=list(set(j for j in r.get("jurisdictions", []) if j)),
                narrative=narrative,
            )
        )
    return waves
