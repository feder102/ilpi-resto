"""Email Service for sending transactional emails.

Development: Uses MailHog SMTP server (no credentials required)
Production: Uses Gmail SMTP or other provider with STARTTLS authentication
"""

import hashlib
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(email: str, reset_link: str) -> None:
    """Send password reset email.

    Args:
        email: Recipient email address
        reset_link: Full reset link to include in email body
    """
    try:
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT
        smtp_user = settings.SMTP_USER
        smtp_password = settings.SMTP_PASSWORD
        smtp_from = settings.SMTP_FROM

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Recupera tu contraseña - ILPI"
        msg["From"] = smtp_from
        msg["To"] = email

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

        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        if smtp_user and smtp_password:
            # Production: STARTTLS (port 587) or SSL (port 465)
            if smtp_port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                    server.ehlo()
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
        else:
            # Development: MailHog doesn't require authentication
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.send_message(msg)

        logger.info(
            "Password reset email sent successfully",
            extra={
                "to": email,
                "smtp_host": smtp_host,
                "smtp_port": smtp_port,
            },
        )
        token_hash_prefix = hashlib.sha256(
            reset_link.split("token=")[-1].encode()
        ).hexdigest()[:8]
        logger.info(
            "Email delivery details",
            extra={
                "to": email,
                "subject": "Recupera tu contraseña - ILPI",
                "smtp_server": f"{smtp_host}:{smtp_port}",
                "token_hash_prefix": token_hash_prefix,
            },
        )

    except Exception as e:
        logger.error(
            "Failed to send password reset email",
            extra={
                "to": email,
                "error": str(e),
                "smtp_host": settings.SMTP_HOST,
                "smtp_port": settings.SMTP_PORT,
            },
        )
