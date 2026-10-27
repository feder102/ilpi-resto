"""Sentry error monitoring integration (Issue #58).

Opt-in: if ``SENTRY_DSN`` is not configured the app runs exactly as before and
no data leaves the server. When configured, unhandled exceptions are reported
to Sentry tagged with ``environment`` and enriched (per-request) with
``tenant_id`` / ``user_id`` context — never with sensitive data (passwords,
tokens, cookies).
"""

import logging
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    from sentry_sdk.types import Event, Hint

logger = logging.getLogger(__name__)

# Header/cookie keys that must never reach Sentry.
_SENSITIVE_KEYS = {"authorization", "cookie", "set-cookie", "x-api-key"}


def _scrub_event(event: "Event", _hint: "Hint") -> "Event | None":
    """Strip sensitive headers/cookies from the outgoing event as defense in depth.

    ``send_default_pii=False`` already excludes most PII, but we explicitly drop
    auth headers and cookies so tokens can never be transmitted.
    """
    request = event.get("request")
    if isinstance(request, dict):
        request.pop("cookies", None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            for key in list(headers):
                if key.lower() in _SENSITIVE_KEYS:
                    headers.pop(key, None)
    return event


def init_sentry() -> bool:
    """Initialise the Sentry SDK if a DSN is configured.

    Returns ``True`` when Sentry was initialised, ``False`` otherwise.
    """
    if not settings.SENTRY_DSN:
        logger.info("Sentry disabled (no SENTRY_DSN configured)")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("sentry-sdk not installed, error monitoring disabled")
        return False

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=settings.SENTRY_RELEASE or None,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        # Do not send PII (request bodies, cookies, user IP) automatically.
        send_default_pii=False,
        before_send=_scrub_event,
        integrations=[StarletteIntegration(), FastApiIntegration()],
    )
    logger.info(
        "Sentry initialised", extra={"environment": settings.SENTRY_ENVIRONMENT}
    )
    return True


def set_request_context(tenant_id: str | None, user_id: str | None, role: str | None) -> None:
    """Attach tenant/user context to the current Sentry scope (no-op if disabled)."""
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk
    except ImportError:
        return

    if user_id:
        sentry_sdk.set_user({"id": user_id})
    if tenant_id:
        sentry_sdk.set_tag("tenant_id", tenant_id)
    if role:
        sentry_sdk.set_tag("role", role)
