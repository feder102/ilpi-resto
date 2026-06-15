"""T013: Database engine and session factory."""

from sqlmodel import Session, create_engine

from app.config import settings

# Managed providers (Railway/Neon/Heroku) sometimes hand out "postgres://" URLs,
# but SQLAlchemy requires the "postgresql://" scheme.
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

# pool_pre_ping recycles stale connections (managed Postgres closes idle ones).
engine = create_engine(_db_url, echo=False, pool_pre_ping=True)


def get_session() -> Session:
    """Create a new database session."""
    return Session(engine)


# Factory function for background jobs and other non-FastAPI contexts
SessionLocal = get_session
