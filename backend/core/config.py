from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings using Pydantic BaseSettings."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── Memory & Context Guardrails ──────────────────────────────────────────
    max_context_chars: int = 24_000
    safe_ram_gb_limit: float = 1.5

    # ── Optional ─────────────────────────────────────────────────────────────
    # You can add API keys or other constants here in the future.


settings = Settings()
