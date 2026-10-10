from app import app
from database.db import db
from models.user import User


ADMIN_EMAIL = "test@ipsacademy.org"


with app.app_context():

    user = User.query.filter_by(email=ADMIN_EMAIL).first()

    if not user:
        print("User not found.")
    else:
        user.role = "admin"

        db.session.commit()

        print(f"{user.email} is now an admin.")