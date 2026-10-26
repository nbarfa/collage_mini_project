from types import SimpleNamespace

from flask_migrate import Migrate
from flask import Flask, session, request, redirect, url_for
from flask_cors import CORS
from flask_mail import Mail

from config import Config
from database.db import db, jwt, bcrypt

from models.user import User
from models.event import Event
from models.volunteer_assignment import VolunteerAssignment
from models.registration import Registration
from models.checkin import Checkin


def create_app():
    app = Flask(__name__)

    # Application configuration
    app.config.from_object(Config)

    # Initialize extensions
    mail = Mail(app)
    CORS(app)
    db.init_app(app)
    Migrate(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)

    # Register blueprints
    from routes.auth import auth_bp
    from routes.events import events_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(admin_bp)

    # Global login protection
    @app.before_request
    def require_login():
        public_endpoints = {
            "auth.login",
            "auth.signup",
            "auth.verify_email",
            "static",
            "health",
        }

        # Allow public endpoints
        if request.endpoint in public_endpoints:
            return None

        # Allow static files
        if request.path.startswith("/static/"):
            return None

        # Check whether the user is logged in
        user_id = session.get("user_id")

        if not user_id:
            return redirect(
                url_for("auth.login", next=request.path)
            )

        # Confirm that the session belongs to an existing user
        user = db.session.get(User, user_id)

        if user is None:
            session.clear()
            return redirect(
                url_for("auth.login", next=request.path)
            )

        return None

    # Make current_user available in all HTML templates
    @app.context_processor
    def inject_current_user():
        user_id = session.get("user_id")
        current_user = None

        if user_id:
            try:
                current_user = db.session.get(User, user_id)
            except (ValueError, TypeError):
                current_user = None

        if current_user:
            current_user.is_authenticated = True
        else:
            current_user = SimpleNamespace(
                is_authenticated=False,
                name=None,
                email=None,
                role=None,
                branch=None,
                year=None,
            )

        return {"current_user": current_user}

    # Health check
    @app.route("/health")
    def health():
        return {"status": "ok"}

    return app


# Create application
app = create_app()


# Run application
if __name__ == "__main__":
    with app.app_context():

        # Database debug information
        print("\n========================================")
        print("DATABASE:", db.engine.url.database)
        print("========================================")

        print("\nREGISTERED SQLALCHEMY TABLES:")

        for table_name in sorted(db.metadata.tables.keys()):
            print(" -", table_name)

        print("========================================\n")

        # Create missing tables
        db.create_all()

        print("db.create_all() completed successfully.")
        print("========================================\n")

    app.run(
        debug=False,
        host="0.0.0.0",
        port=5000,
    )