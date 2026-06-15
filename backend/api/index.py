"""Vercel serverless entrypoint for the FastAPI app.

Vercel's Python runtime detects the ASGI `app` exported here. `vercel.json`
rewrites every request to this function, and FastAPI handles routing internally
(e.g. /api/v1/auth/login, /health, /docs).
"""

import os
import sys

# Ensure the backend root (parent of this `api/` dir) is importable so `app.*` resolves.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402

__all__ = ["app"]
