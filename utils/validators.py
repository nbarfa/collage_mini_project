from flask import current_app


def is_college_email(email: str) -> bool:
    """Only allow emails ending with the configured college domain."""
    if not email:
        return False
    domain = current_app.config["ALLOWED_EMAIL_DOMAIN"].lower()
    return email.lower().strip().endswith(domain)
