from flask import (
    Blueprint,
    request,
    jsonify,
    render_template,
    redirect,
    url_for,
    session,
    flash,
)

from flask_jwt_extended import create_access_token

from database.db import db, bcrypt
from models.user import User
from utils.validators import is_college_email


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/auth",
)


# =========================================================
# SIGNUP
# =========================================================

@auth_bp.route("/signup", methods=["GET", "POST"])
def signup():

    # Display signup page
    if request.method == "GET":
        return render_template("signup.html")

    # Support JSON requests and HTML forms
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    name = str(data.get("name") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "student")

    branch = str(data.get("branch") or "").strip() or None
    year = data.get("year")

    enrollment_number = (
        str(data.get("enrollment_number") or "").strip()
        or None
    )

    # Validate input types
    if not isinstance(password, str):
        password = ""

    if not isinstance(role, str):
        role = ""

    is_json_request = request.is_json

    def signup_error(message, status_code=400):

        if is_json_request:
            return jsonify({"error": message}), status_code

        flash(message, "error")
        return redirect(url_for("auth.signup"))

    # Required fields
    if not name or not email or not password:
        return signup_error(
            "Name, email and password are required"
        )

    # Prevent public signup as an admin
    if role not in ("student", "volunteer"):
        return signup_error("Invalid role for signup")

    # Validate college email
    if not is_college_email(email):
        return signup_error(
            "Please sign up with your college email"
        )

    # Student-specific validation
    if role == "student":

        if not enrollment_number:
            return signup_error(
                "Enrollment number is required"
            )

        if year is not None and str(year).strip():
            try:
                year = int(year)
            except (ValueError, TypeError):
                return signup_error(
                    "Year must be a valid number"
                )
        else:
            year = None

    else:
        # Volunteer accounts do not use student-only fields
        branch = None
        year = None
        enrollment_number = None

    # Check for duplicate email
    if User.query.filter_by(email=email).first():
        return signup_error(
            "An account with this email already exists",
            409,
        )

    # Check for duplicate enrollment number
    if enrollment_number:
        existing_enrollment = User.query.filter_by(
            enrollment_number=enrollment_number
        ).first()

        if existing_enrollment:
            return signup_error(
                "An account with this enrollment number already exists",
                409,
            )

    # Hash password before storing it
    password_hash = bcrypt.generate_password_hash(
        password
    ).decode("utf-8")

    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        role=role,
        branch=branch if role == "student" else None,
        year=year if role == "student" else None,
        enrollment_number=(
            enrollment_number
            if role == "student"
            else None
        ),
    )

    try:
        db.session.add(user)
        db.session.commit()

    except Exception:
        db.session.rollback()

        return signup_error(
            "Unable to create the account. Please try again.",
            500,
        )

    # JSON response for API clients
    if is_json_request:
        return jsonify({
            "message": "Account created",
            "user": user.to_dict(),
        }), 201

    flash(
        "Account created successfully. Please log in.",
        "success",
    )

    return redirect(url_for("auth.login"))


# =========================================================
# LOGIN
# =========================================================

@auth_bp.route("/login", methods=["GET", "POST"])
def login():

    # Display login page
    if request.method == "GET":

        user_id = session.get("user_id")

        if user_id:
            user = db.session.get(User, user_id)

            if user:
                if user.role == "admin":
                    return redirect(
                        url_for("admin.dashboard")
                    )

                return redirect(
                    url_for("events.home")
                )

            # Clear a stale session
            session.clear()

        return render_template("login.html")

    # Support JSON requests and HTML forms
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not isinstance(password, str):
        password = ""

    if not email or not password:
        error_message = "Email and password are required"

        if request.is_json:
            return jsonify({
                "error": error_message
            }), 400

        flash(error_message, "error")
        return redirect(url_for("auth.login"))

    # Find account
    user = User.query.filter_by(email=email).first()

    # Verify password
    if not user or not bcrypt.check_password_hash(
        user.password_hash,
        password,
    ):
        error_message = "Invalid email or password"

        if request.is_json:
            return jsonify({
                "error": error_message
            }), 401

        flash(error_message, "error")
        return redirect(url_for("auth.login"))

    # Create JWT access token
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "name": user.name,
        },
    )

    # Store login information in Flask session
    session.clear()
    session["user_id"] = user.id
    session["user_name"] = user.name
    session["user_role"] = user.role
    session["access_token"] = access_token

    # JSON response for API clients
    if request.is_json:
        return jsonify({
            "access_token": access_token,
            "user": user.to_dict(),
        }), 200

    flash("Login successful.", "success")

    # Redirect to the originally requested local path,
    # if one was supplied. Avoid external redirect URLs.
    next_url = (
        request.form.get("next")
        or request.args.get("next")
    )

    if (
        next_url
        and next_url.startswith("/")
        and not next_url.startswith("//")
        and "\\" not in next_url
    ):
        return redirect(next_url)

    # Default redirects based on role
    if user.role == "admin":
        return redirect(url_for("admin.dashboard"))

    return redirect(url_for("events.home"))


# =========================================================
# LOGOUT
# =========================================================

@auth_bp.route("/logout")
def logout():

    session.clear()

    flash("You have been logged out.", "success")

    return redirect(url_for("auth.login"))