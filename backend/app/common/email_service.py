"""Email Service for sending transactional emails.

In development, emails are logged to console.
In production, emails should be sent via SMTP.
"""

import logging

logger = logging.getLogger(__name__)


def send_password_reset_email(email: str, reset_link: str) -> None:
    """Send password reset email.

    Args:
        email: Recipient email address
        reset_link: Full reset link to include in email

    Development: Logs the email and reset link to console
    Production: Should send via SMTP
    """
    # In development, log the reset link so we can test
    logger.info(
        f"PASSWORD RESET EMAIL",
        extra={
            "to": email,
            "reset_link": reset_link,
        },
    )

    # TODO: In production, integrate with actual SMTP service
    # For now, just log the email content
    print(f"\n{'='*80}")
    print(f"📧 PASSWORD RESET EMAIL (DEV MODE)")
    print(f"{'='*80}")
    print(f"To: {email}")
    print(f"Subject: Recupera tu contraseña - ILPI Staff")
    print(f"\nReset Link: {reset_link}")
    print(f"{'='*80}\n")
