from datetime import datetime
import secrets

from sqlalchemy import UniqueConstraint
from database.db import db


class Registration(db.Model):
    __tablename__ = "registrations"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
    )

    event_id = db.Column(
        db.Integer,
        db.ForeignKey("events.id"),
        nullable=False,
    )

    registered_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    status = db.Column(
        db.String(20),
        default="registered",
        nullable=False,
    )

    # Unique QR ticket token for each registration.
    qr_token = db.Column(
        db.String(64),
        unique=True,
        nullable=False,
        default=lambda: secrets.token_urlsafe(32),
    )

    # Prevent duplicate registrations for the same event.
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "event_id",
            name="uq_user_event_registration",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_id": self.event_id,
            "registered_at": (
                self.registered_at.isoformat()
                if self.registered_at
                else None
            ),
            "status": self.status,
        }
