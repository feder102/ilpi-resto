"""Documentation access gate.

Endpoint used by the reverse proxy (Caddy `forward_auth`) to gate the static
documentation site served under `/docum`. Only users with the **Admin** role may
access it.

Because the docs site is opened as a top-level navigation, the browser only sends
cookies automatically (the access token lives in memory). We therefore validate the
HttpOnly `refresh_token` cookie, which carries the user's role and is signed with the
same secret.

Responses:
- 204 No Content  → user is an active Admin → proxy serves the docs.
- 303 See Other   → not authenticated → redirect to the app login (with ?next=/docum).
- 403 Forbidden   → authenticated but not Admin → access denied (no login loop).
"""

import uuid

from fastapi import APIRouter, Cookie, Response, status
from fastapi.responses import RedirectResponse

from app.common.security import verify_token
from app.dependencies import DbSession
from app.models.user import User

router = APIRouter(tags=["docs-access"])

# Path of the app login, used to redirect unauthenticated users back after sign-in.
_LOGIN_REDIRECT = "/login?next=/docum"


@router.get("/docum/authorize")
def authorize_docs(
    session: DbSession,
    refresh_token: str | None = Cookie(default=None),
) -> Response:
    """Authorize access to the documentation site (Admin only)."""
    login_redirect = RedirectResponse(
        url=_LOGIN_REDIRECT, status_code=status.HTTP_303_SEE_OTHER
    )

    # No cookie → not authenticated.
    if not refresh_token:
        return login_redirect

    payload = verify_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return login_redirect

    user_id = payload.get("sub")
    try:
        user = session.get(User, uuid.UUID(str(user_id)))
    except (ValueError, TypeError):
        return login_redirect

    if not user or not user.is_active:
        return login_redirect

    # Authenticated but not Admin → forbidden (do not bounce to login).
    if user.role != "Admin":
        return Response(
            status_code=status.HTTP_403_FORBIDDEN,
            content="Solo el administrador puede ver la documentación.",
            media_type="text/plain; charset=utf-8",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
