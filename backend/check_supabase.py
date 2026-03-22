#!/usr/bin/env python3
"""
Minimal check: can we reach Supabase Postgres and run SELECT 1?

Usage (from this folder):
  pip install -r requirements.txt
  cp .env.example .env   # then put your real DATABASE_URL in .env
  python check_supabase.py
"""

from __future__ import annotations

import sys


def main() -> int:
    try:
        from app.db import ping_database
    except ImportError:
        print("Install deps: pip install -r requirements.txt")
        return 1
    except RuntimeError as exc:
        print(exc)
        print("  cp .env.example .env  → paste URI from Supabase → Settings → Database")
        return 1

    try:
        ping_database()
    except Exception as exc:
        print("Connection failed:", exc)
        msg = str(exc).lower()
        if "translate host name" in msg or "nodename nor servname" in msg:
            print(
                "\nThe hostname in DATABASE_URL does not resolve. "
                "Copy the host again from the Supabase dashboard (wrong ref, typo, or paused project)."
            )
        return 1

    print("OK — Supabase Postgres connection works (SELECT 1).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
