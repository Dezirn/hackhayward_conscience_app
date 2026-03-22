from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.db.utils import asyncpg_connect_kwargs, to_async_database_url

_settings = get_settings()
_db_url = _settings.database_url.strip()
if not _db_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Add it to backend/.env (see .env.example)."
    )

_async_url = to_async_database_url(_db_url)
async_engine = create_async_engine(
    _async_url,
    pool_pre_ping=True,
    connect_args=asyncpg_connect_kwargs(
        _db_url, ssl_relaxed=_settings.database_ssl_relaxed
    ),
)
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
