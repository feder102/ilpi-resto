"""Email Service for sending transactional emails.

Development: Uses MailHog SMTP server (no credentials required)
Production: Should use actual SMTP service with proper authentication
"""

import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def send_password_reset_email(email: str, reset_link: str) -> None:
    """Send password reset email.

    Args:
        email: Recipient email address
        reset_link: Full reset link to include in email body

    Development: Sends via MailHog SMTP (localhost:1025)
    Production: Sends via configured SMTP service
    """
    try:
        # Get SMTP configuration from environment
        smtp_host = os.getenv("SMTP_HOST", "mailhog")
        smtp_port = int(os.getenv("SMTP_PORT", "1025"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from = os.getenv("SMTP_FROM", "noreply@ilpi.local")

        # Create email message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Recupera tu contraseña - ILPI"
        msg["From"] = smtp_from
        msg["To"] = email

        # Plain text version
        text = f"""\
Recuperación de Contraseña

Hola,

Recibimos una solicitud para recuperar tu contraseña. Si no fuiste tú, ignora este email.

Recupera tu contraseña aquí:
{reset_link}

Este enlace expira en 24 horas.

ILPI - Kitchen Staff Management
"""

        # HTML version
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

        # Attach both versions
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        # Send email via SMTP
        if smtp_user and smtp_password:
            # Production: Use authentication
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        else:
            # Development: MailHog doesn't require authentication
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.send_message(msg)

        logger.info(
            f"Password reset email sent successfully",
            extra={
                "to": email,
                "smtp_host": smtp_host,
                "smtp_port": smtp_port,
            },
        )
        print(f"\n{'='*80}")
        print(f"📧 PASSWORD RESET EMAIL SENT")
        print(f"{'='*80}")
        print(f"To: {email}")
        print(f"Subject: Recupera tu contraseña - ILPI")
        print(f"SMTP Server: {smtp_host}:{smtp_port}")
        print(f"\nReset Link: {reset_link}")
        print(f"{'='*80}\n")

    except Exception as e:
        logger.error(
            f"Failed to send password reset email",
            extra={
                "to": email,
                "error": str(e),
            },
        )
        print(f"\n{'='*80}")
        print(f"❌ EMAIL SENDING FAILED")
        print(f"{'='*80}")
        print(f"To: {email}")
        print(f"Error: {str(e)}")
        print(f"Reset Link (fallback): {reset_link}")
        print(f"{'='*80}\n")
