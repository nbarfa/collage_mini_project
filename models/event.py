from datetime import datetime
from database.db import db


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    venue = db.Column(db.String(150), nullable=False)
    event_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    capacity = db.Column(db.Integer, nullable=True)  # NULL = unlimited

    # Comma-separated values, e.g. "CSE,IT" or "2,3". NULL/empty = open to all.
    allowed_branches = db.Column(db.String(255), nullable=True)
    allowed_years = db.Column(db.String(50), nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_student_eligible(self, student):
        if self.allowed_branches:
            allowed = [b.strip() for b in self.allowed_branches.split(",")]
            if student.branch not in allowed:
                return False
        if self.allowed_years:
            allowed_years = [y.strip() for y in self.allowed_years.split(",")]
            if str(student.year) not in allowed_years:
                return False
        return True

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "venue": self.venue,
            "event_date": self.event_date.isoformat(),
            "start_time": self.start_time.strftime("%H:%M"),
            "capacity": self.capacity,
            "allowed_branches": self.allowed_branches,
            "allowed_years": self.allowed_years,
            "created_by": self.created_by,
        }
