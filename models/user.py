from datetime import datetime
from database.db import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    is_email_verified = db.Column(db.Boolean, nullable=False, default=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # 'admin' | 'student' | 'volunteer'
    role = db.Column(db.String(20), nullable=False)

    branch = db.Column(db.String(50), nullable=True)   # students only
    year = db.Column(db.Integer, nullable=True)        # students only

    enrollment_number = db.Column(
        db.String(50),
        unique=True,
        nullable=True,
    )                                                   # students only

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "is_email_verified": self.is_email_verified,
            "role": self.role,
            "branch": self.branch,
            "year": self.year,
            "enrollment_number": self.enrollment_number,
        }