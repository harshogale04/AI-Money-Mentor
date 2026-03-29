from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    gemini_api_key: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    secret_key: str
    environment: str = "development"
    gemini_model: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
