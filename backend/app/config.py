"""T012: Application settings via pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://ilpi:ilpi_dev_password@localhost:5432/ilpi"
    SECRET_KEY: str = "change-this-to-a-random-string-at-least-32-characters-long"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173"
    LOG_LEVEL: str = "INFO"

    # Auth cookie behaviour (refresh_token). For cross-site setups (frontend and
    # backend on different domains, e.g. Vercel) use COOKIE_SAMESITE="none" and
    # COOKIE_SECURE=true (SameSite=None requires Secure over HTTPS).
    COOKIE_SAMESITE: str = "lax"
    COOKIE_SECURE: bool = False

    # Brevo email API (production). Leave BREVO_API_KEY empty to fall back to
    # SMTP (MailHog) for local development.
    BREVO_API_KEY: str = ""
    BREVO_SENDER_NAME: str = "ILPI"
    BREVO_SENDER_EMAIL: str = ""

    # SMTP fallback for local development (MailHog)
    SMTP_HOST: str = "mailhog"
    SMTP_PORT: int = 1025

    # Frontend URL for building links in emails (password reset, etc.)
    APP_URL: str = "http://localhost:5173"

    # Disable the background APScheduler (Feature 008 nightly batch). Must be true
    # on serverless platforms (e.g. Vercel) where long-running threads don't persist.
    DISABLE_SCHEDULER: bool = False

    # Feature 008: Automatic Time Tracking
    BATCH_TIME_TRACKING_HOUR: int = 1  # Hour of day (0-23) for batch job (default: 01:00 AM)
    BATCH_TIME_TRACKING_MINUTE: int = 0  # Minute of hour (0-59) for batch job

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def batch_time_tracking_hour(self) -> int:
        """Hour of day for batch time tracking job (0-23)."""
        return self.BATCH_TIME_TRACKING_HOUR

    @property
    def batch_time_tracking_minute(self) -> int:
        """Minute of hour for batch time tracking job (0-59)."""
        return self.BATCH_TIME_TRACKING_MINUTE


settings = Settings()
