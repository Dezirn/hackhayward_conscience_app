from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.utils import postgres_connect_args

_settings = get_settings()
_db_url = _settings.database_url.strip()
if not _db_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Add it to backend/.env (see .env.example)."
    )

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    connect_args=postgres_connect_args(_db_url),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ping_database() -> None:
    """Run SELECT 1 on the configured database. Raises on failure."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
