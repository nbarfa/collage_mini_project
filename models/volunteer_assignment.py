
from datetime import datetime

from database.db import db


class VolunteerAssignment(db.Model):
    __tablename__ = "volunteer_assignments"

    id = db.Column(db.Integer, primary_key=True)

    # The registered user who receives volunteer access
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True
    )

    # The admin who assigned volunteer access
    assigned_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    assigned_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    user = db.relationship(
        "User",
        foreign_keys=[user_id]
    )

    admin = db.relationship(
        "User",
        foreign_keys=[assigned_by]
    )
