def postgres_connect_args(url: str) -> dict:
    """Libpq/ssl options for Supabase when the URI omits sslmode."""
    args: dict = {}
    if (
        "supabase.co" in url or "pooler.supabase.com" in url
    ) and "sslmode" not in url.lower():
        args["sslmode"] = "require"
    return args
