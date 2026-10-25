from datetime import datetime
import token
from models.registration import Registration

from flask import (
    Blueprint,
    render_template,
    request,
    session,
    redirect,
    url_for,
    flash,
    jsonify,
)

from database.db import db
from models.event import Event
from models.user import User
from models.volunteer_assignment import VolunteerAssignment
from sqlalchemy.exc import IntegrityError
from models.checkin import Checkin


# =========================================================
# ADMIN BLUEPRINT
# =========================================================

admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/admin",
)


# =========================================================
# ADMIN AUTHENTICATION
# =========================================================

def get_logged_in_admin():
    """Return the logged-in admin user or None."""

    user_id = session.get("user_id")

    if not user_id:
        return None

    try:
        user = db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None

    if not user or user.role != "admin":
        return None

    return user


def admin_login_required_json():
    """Return a JSON error response if the request is not from an admin."""

    if not get_logged_in_admin():
        return jsonify({
            "success": False,
            "message": "Administrator access required.",
        }), 403

    return None


# =========================================================
# ADMIN DASHBOARD
# GET /admin/dashboard
# =========================================================

@admin_bp.route("/dashboard", methods=["GET"])
def dashboard():
    current_user = get_logged_in_admin()

    if not current_user:
        flash(
            "You are not authorized to access the admin panel.",
            "error",
        )
        return redirect(url_for("auth.login"))

    events = Event.query.order_by(
        Event.event_date.asc()
    ).all()

    return render_template(
        "admin/dashboard.html",
        events=events,
        current_user=current_user,
    )


# =========================================================
# CREATE EVENT
# POST /admin/events/create
# =========================================================

@admin_bp.route("/events/create", methods=["POST"])
def create_event():
    current_user = get_logged_in_admin()

    if not current_user:
        flash(
            "You are not authorized to create events.",
            "error",
        )
        return redirect(url_for("auth.login"))

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    venue = request.form.get("venue", "").strip()
    event_date = request.form.get("event_date", "").strip()
    start_time = request.form.get("start_time", "").strip()
    capacity = request.form.get("capacity", "").strip()

    allowed_branches = request.form.get(
        "allowed_branches",
        "",
    ).strip()

    allowed_years = request.form.get(
        "allowed_years",
        "",
    ).strip()

    if not all([
        title,
        description,
        venue,
        event_date,
        start_time,
        capacity,
    ]):
        flash(
            "Please fill in all required fields.",
            "error",
        )
        return redirect(url_for("admin.dashboard"))

    try:
        event_date_value = datetime.strptime(
            event_date,
            "%Y-%m-%d",
        ).date()

    except ValueError:
        flash(
            "Invalid event date.",
            "error",
        )
        return redirect(url_for("admin.dashboard"))

    try:
        start_time_value = datetime.strptime(
            start_time,
            "%H:%M",
        ).time()

    except ValueError:
        flash(
            "Invalid start time.",
            "error",
        )
        return redirect(url_for("admin.dashboard"))

    try:
        capacity_value = int(capacity)

        if capacity_value <= 0:
            raise ValueError

    except ValueError:
        flash(
            "Capacity must be a positive number.",
            "error",
        )
        return redirect(url_for("admin.dashboard"))

    event = Event(
        title=title,
        description=description,
        venue=venue,
        event_date=event_date_value,
        start_time=start_time_value,
        capacity=capacity_value,
        allowed_branches=allowed_branches or None,
        allowed_years=allowed_years or None,
        created_by=current_user.id,
    )

    try:
        db.session.add(event)
        db.session.commit()

        flash(
            "Event created successfully.",
            "success",
        )

    except Exception:
        db.session.rollback()

        flash(
            "An error occurred while creating the event.",
            "error",
        )

    return redirect(url_for("admin.dashboard"))


# =========================================================
# DELETE EVENT
# POST /admin/events/<event_id>/delete
# =========================================================

@admin_bp.route(
    "/events/<int:event_id>/delete",
    methods=["POST"],
)
def delete_event(event_id):
    current_user = get_logged_in_admin()

    if not current_user:
        flash(
            "You are not authorized to delete events.",
            "error",
        )
        return redirect(url_for("auth.login"))

    event = db.session.get(
        Event,
        event_id,
    )

    if not event:
        flash(
            "Event not found.",
            "error",
        )
        return redirect(url_for("admin.dashboard"))

    try:
        db.session.delete(event)
        db.session.commit()

        flash(
            "Event deleted successfully.",
            "success",
        )

    except Exception:
        db.session.rollback()

        flash(
            "An error occurred while deleting the event.",
            "error",
        )

    return redirect(url_for("admin.dashboard"))


# =========================================================
# VOLUNTEERS PAGE
# GET /admin/volunteers
# =========================================================

@admin_bp.route("/volunteers", methods=["GET"])
def volunteers():
    current_user = get_logged_in_admin()

    if not current_user:
        flash(
            "You are not authorized to access volunteers.",
            "error",
        )
        return redirect(url_for("auth.login"))

    assignments = VolunteerAssignment.query.order_by(
        VolunteerAssignment.assigned_at.desc()
    ).all()

    # IMPORTANT:
    # Your actual template filename is volunteers.html.
    return render_template(
        "admin/volunteers.html",
        current_user=current_user,
        assignments=assignments,
        assigned_count=len(assignments),
    )


# =========================================================
# SEARCH REGISTERED USER BY EMAIL
# GET /admin/volunteers/search?email=student@example.com
# =========================================================

@admin_bp.route(
    "/volunteers/search",
    methods=["GET"],
)
def search_volunteer_user():
    auth_error = admin_login_required_json()

    if auth_error:
        return auth_error

    email = request.args.get(
        "email",
        "",
    ).strip().lower()

    if not email:
        return jsonify({
            "success": False,
            "message": "Please enter an email address.",
        }), 400

    user = User.query.filter(
        db.func.lower(User.email) == email
    ).first()

    if not user:
        return jsonify({
            "success": False,
            "message": "No registered user found with this email.",
        }), 404

    if user.role == "admin":
        return jsonify({
            "success": False,
            "message": "Admin accounts cannot be assigned as volunteers.",
        }), 400

    existing_assignment = VolunteerAssignment.query.filter_by(
        user_id=user.id
    ).first()

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "already_assigned": existing_assignment is not None,
        },
    }), 200


# =========================================================
# LIST ASSIGNED VOLUNTEERS
# GET /admin/volunteers/list
# =========================================================

@admin_bp.route(
    "/volunteers/list",
    methods=["GET"],
)
def volunteer_list():
    auth_error = admin_login_required_json()

    if auth_error:
        return auth_error

    assignments = VolunteerAssignment.query.order_by(
        VolunteerAssignment.assigned_at.desc()
    ).all()

    result = []

    for assignment in assignments:
        user = assignment.user

        if not user:
            continue

        result.append({
            "assignment_id": assignment.id,
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "assigned_at": (
                assignment.assigned_at.isoformat()
                if assignment.assigned_at
                else None
            ),
        })

    return jsonify({
        "success": True,
        "count": len(result),
        "volunteers": result,
    }), 200


# =========================================================
# ASSIGN VOLUNTEER ACCESS
# POST /admin/volunteers/assign
#
# JSON example:
# {"email": "student@example.com"}
#
# Or:
# {"user_id": 123}
# =========================================================

@admin_bp.route(
    "/volunteers/assign",
    methods=["POST"],
)
def assign_volunteer():
    current_user = get_logged_in_admin()

    if not current_user:
        return jsonify({
            "success": False,
            "message": "Administrator access required.",
        }), 403

    data = request.get_json(silent=True)

    if data is None:
        data = request.form

    user_id = data.get("user_id")
    email = (
        data.get("email") or ""
    ).strip().lower()

    user = None

    if user_id:
        try:
            user = db.session.get(
                User,
                int(user_id),
            )

        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Invalid user ID.",
            }), 400

    elif email:
        user = User.query.filter(
            db.func.lower(User.email) == email
        ).first()

    else:
        return jsonify({
            "success": False,
            "message": "Provide a registered user's email or ID.",
        }), 400

    if not user:
        return jsonify({
            "success": False,
            "message": "Registered user not found.",
        }), 404

    if user.role == "admin":
        return jsonify({
            "success": False,
            "message": "Admin accounts cannot be assigned as volunteers.",
        }), 400

    existing_assignment = VolunteerAssignment.query.filter_by(
        user_id=user.id
    ).first()

    if existing_assignment:
        return jsonify({
            "success": False,
            "message": "This user already has volunteer access.",
        }), 409

    assignment = VolunteerAssignment(
        user_id=user.id,
        assigned_by=current_user.id,
    )

    try:
        db.session.add(assignment)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Volunteer access assigned successfully.",
            "volunteer": {
                "assignment_id": assignment.id,
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "assigned_at": (
                    assignment.assigned_at.isoformat()
                    if assignment.assigned_at
                    else None
                ),
            },
        }), 201

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "An error occurred while assigning volunteer access.",
        }), 500


# =========================================================
# REMOVE VOLUNTEER ACCESS
# DELETE OR POST /admin/volunteers/<assignment_id>/remove
# =========================================================

@admin_bp.route(
    "/volunteers/<int:assignment_id>/remove",
    methods=["DELETE", "POST"],
)
def remove_volunteer(assignment_id):
    auth_error = admin_login_required_json()

    if auth_error:
        return auth_error

    assignment = db.session.get(
        VolunteerAssignment,
        assignment_id,
    )

    if not assignment:
        return jsonify({
            "success": False,
            "message": "Volunteer assignment not found.",
        }), 404

    try:
        db.session.delete(assignment)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Volunteer access removed successfully.",
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "An error occurred while removing volunteer access.",
        }), 500


# =========================================================
# SEARCH USER FOR ADMIN ASSIGNMENT
# GET /admin/volunteers/admin-search?email=user@example.com
# =========================================================

@admin_bp.route(
    "/volunteers/admin-search",
    methods=["GET"],
)
def search_admin_user():
    auth_error = admin_login_required_json()

    if auth_error:
        return auth_error

    email = request.args.get(
        "email",
        "",
    ).strip().lower()

    if not email:
        return jsonify({
            "success": False,
            "message": "Please enter an email address.",
        }), 400

    user = User.query.filter(
        db.func.lower(User.email) == email
    ).first()

    if not user:
        return jsonify({
            "success": False,
            "message": "No registered user found with this email.",
        }), 404

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "already_admin": user.role == "admin",
        },
    }), 200


# =========================================================
# LIST ASSIGNED ADMINS
# GET /admin/volunteers/admin-list
# =========================================================

@admin_bp.route(
    "/volunteers/admin-list",
    methods=["GET"],
)
def admin_list():
    auth_error = admin_login_required_json()

    if auth_error:
        return auth_error

    current_user = get_logged_in_admin()

    admins = User.query.filter_by(
        role="admin"
    ).order_by(
        User.name.asc()
    ).all()

    result = []

    for admin in admins:
        result.append({
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "role": admin.role,
            "is_current_admin": (
                admin.id == current_user.id
            ),
        })

    return jsonify({
        "success": True,
        "count": len(result),
        "admins": result,
    }), 200

# =========================================================
# ASSIGN ADMIN ACCESS
# POST /admin/volunteers/assign-admin
#
# JSON example:
# {"email": "student@example.com"}
#
# Or:
# {"user_id": 123}
# =========================================================

@admin_bp.route(
    "/volunteers/assign-admin",
    methods=["POST"],
)
def assign_admin():
    current_user = get_logged_in_admin()

    if not current_user:
        return jsonify({
            "success": False,
            "message": "Administrator access required.",
        }), 403

    data = request.get_json(silent=True)

    if data is None:
        data = request.form

    user_id = data.get("user_id")
    email = (
        data.get("email") or ""
    ).strip().lower()

    user = None

    if user_id:
        try:
            user = db.session.get(
                User,
                int(user_id),
            )

        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Invalid user ID.",
            }), 400

    elif email:
        user = User.query.filter(
            db.func.lower(User.email) == email
        ).first()

    else:
        return jsonify({
            "success": False,
            "message": "Provide a registered user's email or ID.",
        }), 400

    if not user:
        return jsonify({
            "success": False,
            "message": "Registered user not found.",
        }), 404

    if user.role == "admin":
        return jsonify({
            "success": False,
            "message": "This user is already an admin.",
        }), 409

    old_role = user.role

    try:
        # If the user was a volunteer, remove the old
        # volunteer assignment because roles are exclusive.
        existing_volunteer_assignment = (
            VolunteerAssignment.query.filter_by(
                user_id=user.id
            ).first()
        )

        if existing_volunteer_assignment:
            db.session.delete(
                existing_volunteer_assignment
            )

        # Promote the user to admin.
        user.role = "admin"

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Admin access assigned successfully.",
            "admin": {
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "previous_role": old_role,
            },
        }), 201

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "An error occurred while assigning admin access.",
        }), 500


# =========================================================
# REMOVE ADMIN ACCESS
# DELETE OR POST /admin/volunteers/admin/<user_id>/remove
# =========================================================

@admin_bp.route(
    "/volunteers/admin/<int:user_id>/remove",
    methods=["DELETE", "POST"],
)
def remove_admin(user_id):
    current_user = get_logged_in_admin()

    if not current_user:
        return jsonify({
            "success": False,
            "message": "Administrator access required.",
        }), 403

    user = db.session.get(
        User,
        user_id,
    )

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found.",
        }), 404

    if user.role != "admin":
        return jsonify({
            "success": False,
            "message": "This user is not an admin.",
        }), 400

    # Do not allow an admin to remove their own access.
    if user.id == current_user.id:
        return jsonify({
            "success": False,
            "message": "You cannot remove your own admin access.",
        }), 400

    try:
        # Return the user to the normal student role.
        user.role = "student"

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Admin access removed successfully.",
            "user": {
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "An error occurred while removing admin access.",
        }), 500


@admin_bp.route("/registrations", methods=["GET"])
def registrations_page():
    auth_error = get_logged_in_admin()

    if not auth_error:
        return redirect(url_for("auth.login"))

    return render_template("admin/registrations.html")

# =========================================================
# LIST EVENT REGISTRATIONS
# GET /admin/registrations/list
# =========================================================

@admin_bp.route("/registrations/list", methods=["GET"])
def registration_list():
    auth_error = admin_login_required_json()

    if auth_error:
        return auth_error

    registrations = (
        db.session.query(Registration, User, Event)
        .join(User, Registration.user_id == User.id)
        .join(Event, Registration.event_id == Event.id)
        .order_by(Registration.registered_at.desc())
        .all()
    )

    result = []

    for registration, user, event in registrations:
        result.append({
            "registration_id": registration.id,
            "student": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "enrollment_number": user.enrollment_number,
                "branch": user.branch,
                "year": user.year,
            },
            "event": {
                "id": event.id,
                "title": event.title,
                "venue": event.venue,
                "event_date": (
                    event.event_date.isoformat()
                    if event.event_date
                    else None
                ),
                "start_time": (
                    event.start_time.strftime("%H:%M")
                    if event.start_time
                    else None
                ),
            },
            "registered_at": (
                registration.registered_at.isoformat()
                if registration.registered_at
                else None
            ),
            "status": registration.status,
        })

    return jsonify({
        "success": True,
        "count": len(result),
        "registrations": result,
    }), 200



@admin_bp.route(
    "/volunteer/events/<int:event_id>/scan",
    methods=["POST"],
)
def volunteer_scan_ticket(event_id):
    """Validate a ticket and record a volunteer check-in."""

    # 1. Verify login.
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "code": "unauthorized",
            "message": "Please log in to scan tickets.",
        }), 401

    volunteer = db.session.get(User, user_id)

    if not volunteer:
        return jsonify({
            "success": False,
            "code": "unauthorized",
            "message": "Volunteer account not found.",
        }), 401

    # 2. Verify that this user has been assigned volunteer access.
    assignment = VolunteerAssignment.query.filter_by(
        user_id=volunteer.id
    ).first()

    if volunteer.role == "admin" or not assignment:
        return jsonify({
            "success": False,
            "code": "forbidden",
            "message": "Volunteer access is required.",
        }), 403

    # 3. Read the QR token sent by the scanner.
    data = request.get_json(silent=True) or {}
    token = str(data.get("token") or "").strip()

    if not token:
        return jsonify({
            "success": False,
            "code": "missing_token",
            "message": "No QR token was provided.",
        }), 400

    # 4. Verify the selected event.
    event = db.session.get(Event, event_id)

    if not event:
        return jsonify({
            "success": False,
            "code": "event_not_found",
            "message": "Event not found.",
        }), 404

    # Reject tickets for past events.
    if event.event_date < datetime.now().date():
        return jsonify({
            "success": False,
            "code": "event_finished",
            "message": "This event has already passed.",
        }), 400

    # 5. Find the registration associated with this QR token.
    registration = Registration.query.filter_by(qr_token=token).first()

    # If the input is not a QR token, check whether it is a printed ticket ID.
    if not registration and token.startswith("UG-"):
        ticket_number = token[3:]

        if ticket_number.isdigit():
            registration = db.session.get(
                Registration,
                int(ticket_number)
            )

    if not registration:
        return jsonify({
            "success": False,
            "code": "invalid_ticket",
            "message": "Invalid Ticket.",
        }), 404

    # 6. Ensure the ticket belongs to the selected event.
    if registration.event_id != event.id:
        return jsonify({
            "success": False,
            "code": "wrong_event",
            "message": "Ticket belongs to another event.",
        }), 400

    # 7. Reject tickets that have already been checked in.
    existing_checkin = Checkin.query.filter_by(
        registration_id=registration.id
    ).first()

    if existing_checkin:
        return jsonify({
            "success": False,
            "code": "already_scanned",
            "message": "QR Already Scanned.",
        }), 409

    # 8. Retrieve the registered student's details.
    student = db.session.get(User, registration.user_id)

    if not student:
        return jsonify({
            "success": False,
            "code": "student_not_found",
            "message": "Student details could not be found.",
        }), 404

    # 9. Record the check-in immediately after a valid scan.
    checkin = Checkin(
        registration_id=registration.id,
        checked_in_by=volunteer.id,
    )

    try:
        db.session.add(checkin)
        db.session.commit()

    except IntegrityError:
        # The unique registration_id constraint protects against
        # two volunteers scanning the same ticket simultaneously.
        db.session.rollback()

        existing_checkin = Checkin.query.filter_by(
            registration_id=registration.id
        ).first()

        if existing_checkin:
            return jsonify({
                "success": False,
                "code": "already_scanned",
                "message": "QR Already Scanned.",
            }), 409

        return jsonify({
            "success": False,
            "code": "checkin_failed",
            "message": "Unable to record the check-in. Please try again.",
        }), 500

    # 10. Return the student's details to the scanner interface.
    return jsonify({
        "success": True,
        "code": "confirmed",
        "message": "Confirmed",
        "student": {
            "name": student.name,
            "enrollment_number": student.enrollment_number,
            "branch": student.branch,
            "year": student.year,
        },
        "event": {
            "id": event.id,
            "title": event.title,
        },
        "checked_in_at": (
            checkin.checked_in_at.isoformat()
            if checkin.checked_in_at
            else None
        ),
    }), 200



@admin_bp.route(
    "/volunteer/events",
    methods=["GET"],
)
def volunteer_upcoming_events():
    """Return current and upcoming events for volunteers."""

    # Verify login.
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Please log in first.",
        }), 401

    volunteer = db.session.get(User, user_id)

    if not volunteer:
        return jsonify({
            "success": False,
            "message": "Volunteer account not found.",
        }), 401

    # Verify volunteer access.
    assignment = VolunteerAssignment.query.filter_by(
        user_id=volunteer.id
    ).first()

    if volunteer.role == "admin" or not assignment:
        return jsonify({
            "success": False,
            "message": "Volunteer access is required.",
        }), 403

    # Exclude past events.
    today = datetime.now().date()

    events = (
        Event.query
        .filter(Event.event_date >= today)
        .order_by(Event.event_date.asc())
        .all()
    )

    # Return only the details needed for event selection.
    event_list = []

    for event in events:
        event_list.append({
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "venue": event.venue,
            "event_date": (
                event.event_date.isoformat()
                if event.event_date
                else None
            ),
            "start_time": (
                str(event.start_time)
                if event.start_time
                else None
            ),
        })

    return jsonify({
        "success": True,
        "events": event_list,
    }), 200
# =========================================================
# VOLUNTEER DASHBOARD PAGE
# GET /admin/volunteer/dashboard
# =========================================================

@admin_bp.route("/volunteer/dashboard", methods=["GET"])
def volunteer_dashboard():
    user_id = session.get("user_id")

    if not user_id:
        return redirect(url_for("auth.login"))

    try:
        user = db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        user = None

    if not user:
        return redirect(url_for("auth.login"))

    # Admin accounts should use the admin dashboard.
    if user.role == "admin":
        return redirect(url_for("admin.dashboard"))

    # Only users assigned volunteer access can open this page.
    assignment = VolunteerAssignment.query.filter_by(
        user_id=user.id
    ).first()

    if not assignment:
        flash("Volunteer access is required.", "error")
        return redirect(url_for("events.home"))

    return render_template(
        "volunteer/volunteer-dashboard.html"
    )