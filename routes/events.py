from datetime import datetime, date
from sqlalchemy.exc import IntegrityError
from flask import current_app
from flask import (
    Blueprint,
    request,
    jsonify,
    render_template,
    session,
    flash,
    redirect,
    url_for,
)

from flask_jwt_extended import (
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

from database.db import db
from models.event import Event
from models.user import User
from models.registration import Registration
from utils.decorators import role_required
from flask import send_file
from services.qr_service import generate_qr_image
from services.pdf_ticket_service import generate_ticket_pdf


events_bp = Blueprint(
    "events",
    __name__,
    url_prefix="/events",
)


# =========================================================
# FRONTEND HOME PAGE
# GET /events/
# =========================================================

@events_bp.route("/", methods=["GET"])
def home():

    events = Event.query.order_by(
        Event.event_date.asc(),
        Event.start_time.asc(),
    ).all()

    current_user = None
    user_id = session.get("user_id")

    if user_id:
        current_user = db.session.get(User, user_id)

    return render_template(
        "home.html",
        events=events,
        current_user=current_user,
    )


# =========================================================
# USER PROFILE
# GET /events/profile
# =========================================================


@events_bp.route("/profile", methods=["GET"])
def profile():
    user_id = session.get("user_id")

    if not user_id:
        flash("Please log in first.", "error")
        return redirect(url_for("auth.login"))

    current_user = db.session.get(User, user_id)

    if not current_user:
        session.clear()
        flash(
            "User not found. Please log in again.",
            "error",
        )
        return redirect(url_for("auth.login"))

    # Fetch registrations belonging to the logged-in user.
    registrations = (
        db.session.query(Registration, Event)
        .join(Event, Registration.event_id == Event.id)
        .filter(Registration.user_id == current_user.id)
        .order_by(Registration.registered_at.desc())
        .all()
    )

    # Prepare event details for the profile template.
    registration_details = []

    for registration, event in registrations:
        registration_details.append({
            "id": registration.id,
            "event_id": event.id,
            "event_title": event.title,
            "venue": event.venue,
            "event_date": event.event_date,
            "event_time": event.start_time,
            "registered_at": registration.registered_at,
            "status": registration.status,
        })

    return render_template(
        "profile.html",
        current_user=current_user,
        registrations=registration_details,
        today=date.today(),
    )



# =========================================================
# GET ALL EVENTS
# GET /events
# JWT authentication required
# =========================================================

@events_bp.route("", methods=["GET"])
@jwt_required()
def list_events():

    claims = get_jwt()
    role = claims.get("role")

    events = Event.query.order_by(
        Event.event_date.asc(),
        Event.start_time.asc(),
    ).all()

    if role == "student":

        user_id = get_jwt_identity()

        try:
            student = db.session.get(User, int(user_id))
        except (ValueError, TypeError):
            student = None

        if not student:
            return jsonify({
                "error": "User not found",
            }), 401

        events = [
            event
            for event in events
            if event.is_student_eligible(student)
        ]

    return jsonify([
        event.to_dict()
        for event in events
    ]), 200


# =========================================================
# GET ONE EVENT
# GET /events/<event_id>
# JWT authentication required
# =========================================================

@events_bp.route("/<int:event_id>", methods=["GET"])
@jwt_required()
def get_event(event_id):

    event = db.session.get(Event, event_id)

    if not event:
        return jsonify({
            "error": "Event not found",
        }), 404

    return jsonify(event.to_dict()), 200


# =========================================================
# CREATE EVENT
# POST /events
# Admin only
# =========================================================

@events_bp.route("", methods=["POST"])
@role_required("admin")
def create_event():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON object is required",
        }), 400

    required = [
        "title",
        "venue",
        "event_date",
        "start_time",
    ]

    missing = [
        field
        for field in required
        if not data.get(field)
    ]

    if missing:
        return jsonify({
            "error": f"Missing fields: {', '.join(missing)}",
        }), 400

    try:
        event_date = datetime.strptime(
            data["event_date"],
            "%Y-%m-%d",
        ).date()

        start_time = datetime.strptime(
            data["start_time"],
            "%H:%M",
        ).time()

    except (ValueError, TypeError):
        return jsonify({
            "error": (
                "event_date must be YYYY-MM-DD "
                "and start_time must be HH:MM"
            ),
        }), 400

    # Capacity must be a positive integer or null.
    capacity = data.get("capacity")

    if capacity is not None:

        try:
            if isinstance(capacity, bool):
                raise ValueError

            capacity = int(capacity)

            if capacity <= 0:
                raise ValueError

        except (ValueError, TypeError):
            return jsonify({
                "error": "Capacity must be a positive integer or null",
            }), 400

    # Check required text fields.
    title = data.get("title")
    venue = data.get("venue")

    if not isinstance(title, str) or not title.strip():
        return jsonify({
            "error": "Title must be a non-empty string",
        }), 400

    if not isinstance(venue, str) or not venue.strip():
        return jsonify({
            "error": "Venue must be a non-empty string",
        }), 400

    try:
        admin_id = int(get_jwt_identity())

    except (ValueError, TypeError):
        return jsonify({
            "error": "Invalid admin identity",
        }), 401

    admin = db.session.get(User, admin_id)

    if not admin or admin.role != "admin":
        return jsonify({
            "error": "Admin account not found",
        }), 403

    event = Event(
        title=title.strip(),
        description=data.get("description"),
        venue=venue.strip(),
        event_date=event_date,
        start_time=start_time,
        capacity=capacity,
        allowed_branches=data.get("allowed_branches"),
        allowed_years=data.get("allowed_years"),
        created_by=admin_id,
    )

    try:
        db.session.add(event)
        db.session.commit()

        return jsonify({
            "message": "Event created",
            "event": event.to_dict(),
        }), 201

    except Exception:
        db.session.rollback()

        return jsonify({
            "error": "Unable to create event. Please try again.",
        }), 500


# =========================================================
# UPDATE EVENT
# PUT /events/<event_id>
# Admin only
# =========================================================

@events_bp.route("/<int:event_id>", methods=["PUT"])
@role_required("admin")
def update_event(event_id):

    event = db.session.get(Event, event_id)

    if not event:
        return jsonify({
            "error": "Event not found",
        }), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON object is required",
        }), 400

    # Validate and update text fields.
    if "title" in data:

        title = data["title"]

        if not isinstance(title, str) or not title.strip():
            return jsonify({
                "error": "Title must be a non-empty string",
            }), 400

        event.title = title.strip()

    if "venue" in data:

        venue = data["venue"]

        if not isinstance(venue, str) or not venue.strip():
            return jsonify({
                "error": "Venue must be a non-empty string",
            }), 400

        event.venue = venue.strip()

    if "description" in data:
        event.description = data["description"]

    if "allowed_branches" in data:
        event.allowed_branches = data["allowed_branches"]

    if "allowed_years" in data:
        event.allowed_years = data["allowed_years"]

    # Validate capacity.
    if "capacity" in data:

        capacity = data["capacity"]

        if capacity is not None:

            try:
                if isinstance(capacity, bool):
                    raise ValueError

                capacity = int(capacity)

                if capacity <= 0:
                    raise ValueError

            except (ValueError, TypeError):
                return jsonify({
                    "error": (
                        "Capacity must be a positive integer or null"
                    ),
                }), 400

        event.capacity = capacity

    # Validate event date.
    if "event_date" in data:

        try:
            event.event_date = datetime.strptime(
                data["event_date"],
                "%Y-%m-%d",
            ).date()

        except (ValueError, TypeError):
            return jsonify({
                "error": "event_date must be YYYY-MM-DD",
            }), 400

    # Validate start time.
    if "start_time" in data:

        try:
            event.start_time = datetime.strptime(
                data["start_time"],
                "%H:%M",
            ).time()

        except (ValueError, TypeError):
            return jsonify({
                "error": "start_time must be HH:MM",
            }), 400

    try:
        db.session.commit()

        return jsonify({
            "message": "Event updated",
            "event": event.to_dict(),
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "error": "Unable to update event. Please try again.",
        }), 500


# =========================================================
# DELETE EVENT
# DELETE /events/<event_id>
# Admin only
# =========================================================

@events_bp.route("/<int:event_id>", methods=["DELETE"])
@role_required("admin")
def delete_event(event_id):

    event = db.session.get(Event, event_id)

    if not event:
        return jsonify({
            "error": "Event not found",
        }), 404

    try:
        db.session.delete(event)
        db.session.commit()

        return jsonify({
            "message": "Event deleted",
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "error": "Unable to delete event. Please try again.",
        }), 500


# =========================================================
# EVENT DETAILS PAGE
# GET /events/<event_id>/detail
# =========================================================

@events_bp.route("/<int:event_id>/detail", methods=["GET"])
def event_detail(event_id):

    event = db.session.get(Event, event_id)

    if not event:
        flash("Event not found.", "error")
        return redirect(url_for("events.home"))

    user_id = session.get("user_id")
    current_user = None

    if user_id:
        current_user = db.session.get(User, user_id)

    return render_template(
        "event.html",
        event=event,
        current_user=current_user,
    )


# =========================================================
# REGISTRATION PAGE
# GET /events/<event_id>/register
# =========================================================

@events_bp.route("/<int:event_id>/register", methods=["GET"])
def registration_page(event_id):

    # Get logged-in user
    user_id = session.get("user_id")

    if not user_id:
        flash("Please log in first.", "error")
        return redirect(url_for("auth.login"))

    user = db.session.get(User, user_id)

    if not user:
        session.clear()
        flash(
            "User not found. Please log in again.",
            "error",
        )
        return redirect(url_for("auth.login"))

    # Find event
    event = db.session.get(Event, event_id)

    if not event:
        flash("Event not found.", "error")
        return redirect(url_for("events.home"))

    # Find this user's registration for this event
    registration = Registration.query.filter_by(
        user_id=user.id,
        event_id=event.id,
    ).first()

    # Get the requested step
    step = request.args.get("step", default=1, type=int)

    if step not in (1, 2, 3):
        step = 1

    # Only show the ticket step if registration exists
    if step == 3 and not registration:
        flash(
            "Please register for this event before viewing your ticket.",
            "error",
        )
        step = 1

    # Display the registration page
    return render_template(
        "register.html",
        event=event,
        current_user=user,
        registration=registration,
        step=step,
    )


# =========================================================
# REGISTER FOR EVENT
# POST /events/<event_id>/register
# =========================================================

@events_bp.route("/<int:event_id>/register", methods=["POST"])
def register_for_event(event_id):

    # -----------------------------------------------------
    # Get logged-in user
    # -----------------------------------------------------

    user_id = session.get("user_id")

    if not user_id:
        flash("Please log in first.", "error")
        return redirect(url_for("auth.login"))

    user = db.session.get(User, user_id)

    if not user:
        session.clear()
        flash(
            "User not found. Please log in again.",
            "error",
        )
        return redirect(url_for("auth.login"))

    # -----------------------------------------------------
    # Students, admins, and volunteers can register.
    # Student eligibility is checked after the event is found.
    # -----------------------------------------------------

    # -----------------------------------------------------
    # Find event
    # -----------------------------------------------------

    event = db.session.get(Event, event_id)

    if not event:
        flash("Event not found.", "error")
        return redirect(url_for("events.home"))

    # -----------------------------------------------------
    # Check student eligibility
    # -----------------------------------------------------

    if user.role == "student" and not event.is_student_eligible(user):

        flash(
            "You are not eligible to register for this event.",
            "error",
        )

        return redirect(
            url_for(
                "events.event_detail",
                event_id=event_id,
            )
        )

    # -----------------------------------------------------
    # Check duplicate registration
    # -----------------------------------------------------

    existing_registration = Registration.query.filter_by(
        user_id=user.id,
        event_id=event.id,
    ).first()

    if existing_registration:
        flash(
            "You are already registered for this event.",
            "error",
        )

        return redirect(
            url_for(
                "events.event_detail",
                event_id=event_id,
            )
        )

    # -----------------------------------------------------
    # Check event capacity
    # -----------------------------------------------------

    if event.capacity is not None:

        registered_count = Registration.query.filter_by(
            event_id=event.id,
            status="registered",
        ).count()

        if registered_count >= event.capacity:
            flash(
                "Sorry, this event is already full.",
                "error",
            )

            return redirect(
                url_for(
                    "events.event_detail",
                    event_id=event_id,
                )
            )

    # -----------------------------------------------------
    # Create registration
    # -----------------------------------------------------

    registration = Registration(
        user_id=user.id,
        event_id=event.id,
        status="registered",
    )

    try:
        db.session.add(registration)
        db.session.commit()

        flash(
            "You have successfully registered for the event!",
            "success",
        )

        return redirect(
            url_for(
                "events.registration_page",
                event_id=event_id,
                step=3,
            )
        )

    except Exception:
        db.session.rollback()

        flash(
            "Unable to register for the event. Please try again.",
            "error",
        )

        return redirect(
            url_for(
                "events.registration_page",
                event_id=event_id,
            )
        )


# =========================================================
# UPDATE STUDENT PROFILE
# PATCH /events/profile/update
# Updates only name, branch, year, and enrollment number
# =========================================================

@events_bp.route("/profile/update", methods=["PATCH"])
def update_profile():

    # Get the logged-in user's ID from the Flask session.
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "error": "Please log in to update your profile."
        }), 401

    current_user = db.session.get(User, user_id)

    if not current_user:
        session.clear()
        return jsonify({
            "error": "User not found. Please log in again."
        }), 401

    # Read the JSON data sent by the frontend.
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A valid JSON object is required."
        }), 400

    # Accept only these four editable fields.
    allowed_fields = {
        "name",
        "branch",
        "year",
        "enrollment_number"
    }

    if not data or not set(data.keys()).issubset(allowed_fields):
        return jsonify({
            "error": "Only name, branch, year, and enrollment number can be updated."
        }), 400

    # Validate the name.
    if "name" in data:
        name = data["name"]

        if not isinstance(name, str) or not name.strip():
            return jsonify({
                "error": "Name cannot be empty."
            }), 400

        name = name.strip()

        if len(name) > 100:
            return jsonify({
                "error": "Name cannot exceed 100 characters."
            }), 400

        current_user.name = name

    # Validate the branch.
    if "branch" in data:
        branch = data["branch"]

        if not isinstance(branch, str) or not branch.strip():
            return jsonify({
                "error": "Branch cannot be empty."
            }), 400

        branch = branch.strip()

        if len(branch) > 50:
            return jsonify({
                "error": "Branch cannot exceed 50 characters."
            }), 400

        current_user.branch = branch

    # Validate the academic year.
    if "year" in data:
        year = data["year"]

        # Reject booleans and non-integer values.
        if (
            isinstance(year, bool)
            or not isinstance(year, int)
            or year < 1
            or year > 5
        ):
            return jsonify({
                "error": "Year must be an integer between 1 and 5."
            }), 400

        current_user.year = year

    # Validate the enrollment number.
    if "enrollment_number" in data:
        enrollment_number = data["enrollment_number"]

        if not isinstance(enrollment_number, str):
            return jsonify({
                "error": "Enrollment number must be text."
            }), 400

        enrollment_number = enrollment_number.strip()

        if len(enrollment_number) > 50:
            return jsonify({
                "error": "Enrollment number cannot exceed 50 characters."
            }), 400

        # Allow an empty enrollment number if the user has none.
        enrollment_number = enrollment_number or None

        # Check whether another account already uses this number.
        if enrollment_number:
            existing_user = User.query.filter(
                User.enrollment_number == enrollment_number,
                User.id != current_user.id
            ).first()

            if existing_user:
                return jsonify({
                    "error": "This enrollment number is already registered to another account."
                }), 409

        current_user.enrollment_number = enrollment_number

    # Save the changes to PostgreSQL.
    try:
        db.session.commit()

        return jsonify({
            "message": "Profile updated successfully.",
            "user": {
                "name": current_user.name,
                "branch": current_user.branch,
                "year": current_user.year,
                "enrollment_number": current_user.enrollment_number
            }
        }), 200

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "error": "This enrollment number is already in use."
        }), 409

    except Exception:
        db.session.rollback()

        return jsonify({
            "error": "Unable to update your profile. Please try again."
        }), 500



# =========================================================
# QR TICKET IMAGE
# GET /events/registration/<registration_id>/qr
# =========================================================

@events_bp.route(
    "/registration/<int:registration_id>/qr",
    methods=["GET"],
)
def registration_qr(registration_id):
    # Require a logged-in user.
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "error": "Please log in to view your ticket."
        }), 401

    # Only allow the owner to access this registration's QR.
    registration = Registration.query.filter_by(
        id=registration_id,
        user_id=user_id,
    ).first()

    if not registration:
        return jsonify({
            "error": "Ticket not found."
        }), 404

    try:
        image_buffer = generate_qr_image(registration.qr_token)

        response = send_file(
            image_buffer,
            mimetype="image/png",
            download_name=f"ticket-{registration.id}.png",
            as_attachment=False,
        )

        response.headers["Cache-Control"] = "no-store"
        return response

    except Exception:
        return jsonify({
            "error": "Unable to generate the QR ticket."
        }), 500



@events_bp.route(
    "/registration/<int:registration_id>/ticket.pdf",
    methods=["GET"],
)
def download_registration_ticket(registration_id):
    # Check that the student is logged in.
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "error": "Please log in to download your ticket."
        }), 401

    # Only allow the owner of this registration to download the ticket.
    registration = Registration.query.filter_by(
        id=registration_id,
        user_id=user_id,
    ).first()

    if not registration:
        return jsonify({
            "error": "Ticket not found."
        }), 404

    # Load the event and student details.
    event = db.session.get(Event, registration.event_id)
    user = db.session.get(User, user_id)

    if not event or not user:
        return jsonify({
            "error": "Event or student details could not be found."
        }), 404

    try:
        # Generate the A4 PDF using the actual registration QR token.
        pdf_buffer = generate_ticket_pdf(
            event_title=event.title,
            event_date=str(event.event_date) if event.event_date else "",
            event_time=str(event.start_time) if event.start_time else "",
            venue=event.venue,
            student_name=user.name,
            branch=user.branch,
            year=user.year,
            ticket_id=f"UG-{registration.id:06d}",
            qr_token=registration.qr_token,
        )

        # Send the PDF as a downloadable file.
        response = send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"UniGate-Ticket-UG-{registration.id:06d}.pdf",
        )

        response.headers["Cache-Control"] = "no-store"

        return response

    except Exception:
        current_app.logger.exception(
            "Failed to generate PDF ticket for registration %s",
            registration_id,
        )

        return jsonify({
            "error": "Unable to generate your PDF ticket."
        }), 500
