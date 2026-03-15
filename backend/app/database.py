"""T013: Database engine and session factory."""

from sqlmodel import Session, create_engine

from app.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)


def get_session() -> Session:
    """Create a new database session."""
    return Session(engine)


# Factory function for background jobs and other non-FastAPI contexts
SessionLocal = get_session
