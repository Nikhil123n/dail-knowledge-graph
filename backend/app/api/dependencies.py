import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from neo4j import AsyncDriver
from app.services import neo4j_service

# Resolve .env from repo root regardless of where uvicorn is launched from.
# dependencies.py lives at  backend/app/api/dependencies.py
# .env lives at             <repo_root>/.env  (three levels up)
_ENV_FILE = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env")
)


class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "dail_password"
    gemini_api_key: str = ""
    courtlistener_base_url: str = "https://www.courtlistener.com"

    class Config:
        env_file = _ENV_FILE
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


async def get_neo4j() -> AsyncDriver:
    settings = get_settings()
    return await neo4j_service.get_driver(
        settings.neo4j_uri,
        settings.neo4j_user,
        settings.neo4j_password,
    )
