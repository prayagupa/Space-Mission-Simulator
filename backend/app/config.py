from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = BACKEND_ROOT / "content" / "missions"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{BACKEND_ROOT / 'spacemission.db'}"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    session_cookie_name: str = "space_mission_session"
    session_max_age: int = 60 * 60 * 24 * 30
    tick_rate_hz: float = 20.0
    mission_timeout_seconds: float = 600.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
