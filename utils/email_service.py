from flask import current_app, url_for
from flask_mail import Message
from flask_mail import Mail

from utils.email_verification import generate_verification_token


def send_verification_email(user):
    token = generate_verification_token(user.email)

    verification_url = url_for(
        "auth.verify_email",
        token=token,
        _external=True,
    )

    message = Message(
        subject="Verify Your UniGate Email",
        recipients=[user.email],
        body=f"""
Hello {user.name},

Welcome to UniGate!

Please verify your email address by clicking the link below:

{verification_url}

This link expires in 1 hour.

If you did not create this account, you can ignore this email.

Regards,
UniGate Team
""",
    )

    mail = current_app.extensions["mail"]
    mail.send(message)
