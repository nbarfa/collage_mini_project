from datetime import datetime

from sqlalchemy import UniqueConstraint
from database.db import db


class Checkin(db.Model):
    __tablename__ = "checkin"

    id = db.Column(db.Integer, primary_key=True)

    registration_id = db.Column(
        db.Integer,
        db.ForeignKey("registrations.id"),
        nullable=False,
        unique=True,
    )

    checked_in_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    checked_in_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "registration_id",
            name="uq_checkin_registration",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "registration_id": self.registration_id,
            "checked_in_at": (
                self.checked_in_at.isoformat()
                if self.checked_in_at
                else None
            ),
            "checked_in_by": self.checked_in_by,
        }