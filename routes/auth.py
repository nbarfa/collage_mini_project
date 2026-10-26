from flask import (
    Blueprint,
    request,
    jsonify,
    render_template,
    redirect,
    url_for,
    session,
    flash,
    current_app,
)

from flask_jwt_extended import create_access_token

from database.db import db, bcrypt
from models.user import User
from utils.validators import is_college_email
from utils.email_service import send_verification_email
from utils.email_verification import verify_verification_token


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

    if request.method == "GET":
        return render_template("signup.html")

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

    if not isinstance(password, str):
        password = ""

    if not isinstance(role, str):
        role = ""

    is_json_request = request.is_json

    def signup_error(message, status_code=400):

        if is_json_request:
            response = {"error": message}

            if "email already exists" in message.lower():
                response["redirect_url"] = url_for("auth.login")

            return jsonify(response), status_code

        flash(message, "error")

        if "email already exists" in message.lower():
            return redirect(url_for("auth.login"))

        return redirect(url_for("auth.signup"))

    # Validate required fields
    if not name or not email or not password:
        return signup_error(
            "Name, email and password are required"
        )

    # Prevent public admin signup
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
        branch = None
        year = None
        enrollment_number = None

    # Check duplicate email
    if User.query.filter_by(email=email).first():
        return signup_error(
            "An account with this email already exists",
            409,
        )

    # Check duplicate enrollment number
    if enrollment_number:
        existing_enrollment = User.query.filter_by(
            enrollment_number=enrollment_number
        ).first()

        if existing_enrollment:
            return signup_error(
                "An account with this enrollment number already exists",
                409,
            )

    # Hash password
    password_hash = bcrypt.generate_password_hash(
        password
    ).decode("utf-8")

    # Create an unverified account
    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        role=role,
        is_email_verified=False,
        branch=branch if role == "student" else None,
        year=year if role == "student" else None,
        enrollment_number=(
            enrollment_number if role == "student" else None
        ),
    )

    try:
        db.session.add(user)
        db.session.commit()

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Account creation failed")

        return signup_error(
            "Unable to create the account. Please try again.",
            500,
        )

    # Send verification email after saving the account
    try:
        send_verification_email(user)

    except Exception:
        current_app.logger.exception(
            "Failed to send verification email to %s",
            user.email,
        )

        message = (
            "Your account was created, but the verification email "
            "could not be sent. Please try again later."
        )

        if is_json_request:
            return jsonify({"message": message}), 500

        flash(message, "error")
        return redirect(url_for("auth.login"))

    # Signup success
    message = (
        "Account created successfully. "
        "Please check your email to verify your account."
    )

    if is_json_request:
        return jsonify({
            "message": message,
            "redirect_url": url_for("auth.login"),
        }), 201

    flash(message, "success")
    return redirect(url_for("auth.login"))


# =========================================================
# EMAIL VERIFICATION
# =========================================================

@auth_bp.route("/verify-email/<token>", methods=["GET"])
def verify_email(token):

    email = verify_verification_token(token)

    if not email:
        message = (
            "This verification link is invalid or has expired. "
            "Please request a new verification email."
        )

        if request.is_json:
            return jsonify({"error": message}), 400

        flash(message, "error")
        return redirect(url_for("auth.login"))

    user = User.query.filter_by(email=email).first()

    if not user:
        message = "No account was found for this verification link."

        if request.is_json:
            return jsonify({"error": message}), 404

        flash(message, "error")
        return redirect(url_for("auth.signup"))

    if user.is_email_verified:
        message = "Your email address is already verified."

        if request.is_json:
            return jsonify({"message": message}), 200

        flash(message, "info")
        return redirect(url_for("auth.login"))

    user.is_email_verified = True

    try:
        db.session.commit()

    except Exception:
        db.session.rollback()

        current_app.logger.exception(
            "Failed to verify email for %s",
            email,
        )

        message = (
            "Unable to verify your email right now. Please try again."
        )

        if request.is_json:
            return jsonify({"error": message}), 500

        flash(message, "error")
        return redirect(url_for("auth.login"))

    message = "Email verified successfully. You can now log in."

    if request.is_json:
        return jsonify({"message": message}), 200

    flash(message, "success")
    return redirect(url_for("auth.login"))


# =========================================================
# LOGIN
# =========================================================

@auth_bp.route("/login", methods=["GET", "POST"])
def login():

    # Check existing session
    user_id = session.get("user_id")

    if user_id:
        user = db.session.get(User, user_id)

        if user:
            if (
                user.role in ("student", "volunteer")
                and not user.is_email_verified
            ):
                session.clear()

            else:
                if request.is_json:
                    return jsonify({
                        "message": "You are already logged in.",
                        "user": user.to_dict(),
                    }), 200

                if user.role == "admin":
                    return redirect(url_for("admin.dashboard"))

                return redirect(url_for("events.home"))

        else:
            session.clear()

    # Display login page
    if request.method == "GET":
        return render_template("login.html")

    # Parse request
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    email = str(data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not isinstance(password, str):
        password = ""

    # Validate required fields
    if not email or not password:
        error_message = "Email and password are required."

        if request.is_json:
            return jsonify({"error": error_message}), 400

        flash(error_message, "error")
        return redirect(url_for("auth.login"))

    # Find user
    user = User.query.filter_by(email=email).first()

    # Verify password
    if not user or not bcrypt.check_password_hash(
        user.password_hash,
        password,
    ):
        error_message = "Invalid email or password."

        if request.is_json:
            return jsonify({"error": error_message}), 401

        flash(error_message, "error")
        return redirect(url_for("auth.login"))

    # Require email verification for students and volunteers
    if (
        user.role in ("student", "volunteer")
        and not user.is_email_verified
    ):
        error_message = (
            "Please verify your email address before logging in. "
            "Check your inbox for the verification link."
        )

        if request.is_json:
            return jsonify({"error": error_message}), 403

        flash(error_message, "error")
        return redirect(url_for("auth.login"))

    # Create JWT
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "name": user.name,
        },
    )

    # Store session
    session.clear()
    session["user_id"] = user.id
    session["user_name"] = user.name
    session["user_role"] = user.role
    session["access_token"] = access_token

    # JSON response
    if request.is_json:
        return jsonify({
            "message": "Login successful.",
            "access_token": access_token,
            "user": user.to_dict(),
        }), 200
    # Safe redirect to originally requested local path
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

    # Default redirect
    if user.role == "admin":
        return redirect(url_for("admin.dashboard"))

    return redirect(url_for("events.home"))


# =========================================================
# LOGOUT
# =========================================================

@auth_bp.route("/logout", methods=["GET", "POST"])
def logout():

    user_id = session.get("user_id")

    if request.is_json:
        if not user_id:
            return jsonify({
                "message": "You are already logged out."
            }), 200

        session.clear()

        return jsonify({
            "message": "You have been logged out successfully."
        }), 200

    if not user_id:
        flash("You are already logged out.", "info")
        return redirect(url_for("auth.login"))

    session.clear()

    flash(
        "You have been logged out successfully.",
        "success",
    )

    return redirect(url_for("auth.login"))