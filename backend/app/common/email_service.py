"""Email Service for sending transactional emails.

Production: Mailjet HTTP API (when MAILJET_API_KEY is set)
Development: MailHog SMTP (fallback when no API key)
"""

import hashlib
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SUBJECT = "Recupera tu contraseña - ILPI"


def _build_email_body(reset_link: str) -> tuple[str, str]:
    """Return (plain_text, html) email body."""
    text = f"""\
Recuperación de Contraseña

Hola,

Recibimos una solicitud para recuperar tu contraseña. Si no fuiste tú, ignora este email.

Recupera tu contraseña aquí:
{reset_link}

Este enlace expira en 24 horas.

ILPI - Kitchen Staff Management
"""

    html = f"""\
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #007bff;">Recuperación de Contraseña</h2>
    <p>Hola,</p>
    <p>Recibimos una solicitud para recuperar tu contraseña. Si no fuiste tú, ignora este email.</p>
    <p>
      <a href="{reset_link}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Recuperar mi contraseña
      </a>
    </p>
    <p>O copia y pega este enlace en tu navegador:</p>
    <p><code style="background-color: #f5f5f5; padding: 10px; display: block; border-radius: 3px; word-break: break-all;">{reset_link}</code></p>
    <p><strong>Este enlace expira en 24 horas.</strong></p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p><small style="color: #666;">ILPI - Kitchen Staff Management System</small></p>
  </body>
</html>
"""
    return text, html


def _send_via_mailjet(email: str, text: str, html: str) -> None:
    """Send email using Mailjet Send API v3.1."""
    response = httpx.post(
        "https://api.mailjet.com/v3.1/send",
        auth=(settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY),
        json={
            "Messages": [
                {
                    "From": {
                        "Email": settings.MAILJET_SENDER_EMAIL,
                        "Name": settings.MAILJET_SENDER_NAME,
                    },
                    "To": [{"Email": email}],
                    "Subject": SUBJECT,
                    "TextPart": text,
                    "HTMLPart": html,
                }
            ]
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    status = data.get("Messages", [{}])[0].get("Status", "unknown")
    logger.info(
        "Password reset email sent via Mailjet",
        extra={"to": email, "status": status},
    )


def _send_via_smtp(email: str, text: str, html: str) -> None:
    """Send email using SMTP (MailHog for development)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = SUBJECT
    msg["From"] = "noreply@ilpi.local"
    msg["To"] = email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.send_message(msg)

    logger.info(
        "Password reset email sent via SMTP",
        extra={"to": email, "smtp_host": settings.SMTP_HOST},
    )


def send_password_reset_email(email: str, reset_link: str) -> None:
    """Send password reset email via Mailjet (production) or SMTP (development)."""
    try:
        text, html = _build_email_body(reset_link)

        if settings.MAILJET_API_KEY:
            _send_via_mailjet(email, text, html)
        else:
            _send_via_smtp(email, text, html)

        token_hash_prefix = hashlib.sha256(
            reset_link.split("token=")[-1].encode()
        ).hexdigest()[:8]
        logger.info(
            "Email delivery details",
            extra={"to": email, "token_hash_prefix": token_hash_prefix},
        )

    except Exception as e:
        logger.error(
            "Failed to send password reset email",
            extra={"to": email, "error": str(e)},
        )
