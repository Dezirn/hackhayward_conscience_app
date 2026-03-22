from __future__ import annotations


def postgres_connect_args(url: str) -> dict:
    """Libpq/ssl options for Supabase when the URI omits sslmode."""
    args: dict = {}
    if (
        "supabase.co" in url or "pooler.supabase.com" in url
    ) and "sslmode" not in url.lower():
        args["sslmode"] = "require"
    return args


def _asyncpg_implies_tls(url: str) -> bool:
    u = url.lower()
    if "sslmode=disable" in u:
        return False
    if "sslmode=require" in u or "sslmode=verify" in u:
        return True
    if "supabase.co" in u or "pooler.supabase.com" in u:
        return True
    return False


def to_async_database_url(url: str) -> str:
    """Build asyncpg URL from a standard Postgres URI."""
    u = url.strip()
    pairs = (
        ("postgresql+psycopg2://", "postgresql+asyncpg://"),
        ("postgresql://", "postgresql+asyncpg://"),
        ("postgres://", "postgresql+asyncpg://"),
    )
    for sync_prefix, async_prefix in pairs:
        if u.startswith(sync_prefix):
            return async_prefix + u[len(sync_prefix) :]
    if u.startswith("postgresql+asyncpg://"):
        return u
    raise ValueError("DATABASE_URL must be a postgresql:// or postgresql+asyncpg:// URI")


def asyncpg_connect_kwargs(url: str, *, ssl_relaxed: bool | None = None) -> dict:
    """TLS for asyncpg: use relaxed verify when the URL implies TLS (hackathon / dev DBs).

    Opt into strict certificate verification with DATABASE_SSL_STRICT=1 or
    database_ssl_relaxed=false (DATABASE_SSL_RELAXED=0).
    """
    import os
    import ssl

    if not _asyncpg_implies_tls(url):
        return {}

    if ssl_relaxed is not None:
        use_relaxed = ssl_relaxed
    else:
        strict = os.getenv("DATABASE_SSL_STRICT", "").lower() in ("1", "true", "yes")
        if strict:
            use_relaxed = False
        else:
            rel = os.getenv("DATABASE_SSL_RELAXED", "").lower()
            use_relaxed = rel not in ("0", "false", "no")

    if use_relaxed:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return {"ssl": ctx}
    return {"ssl": True}
