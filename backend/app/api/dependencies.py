from functools import lru_cache
from pydantic_settings import BaseSettings
from neo4j import AsyncDriver
from app.services import neo4j_service


class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "dail_password"
    gemini_api_key: str = ""
    courtlistener_base_url: str = "https://www.courtlistener.com"

    class Config:
        env_file = ".env"
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
