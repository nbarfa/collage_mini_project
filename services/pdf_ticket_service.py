
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from services.qr_service import generate_qr_image


def generate_ticket_pdf(
    event_title,
    event_date,
    event_time,
    venue,
    student_name,
    branch,
    year,
    ticket_id,
    qr_token,
):
    """
    Generate a UniGate event ticket as an A4 PDF.

    The PDF uses the UniGate dark theme and places a large,
    scannable QR code below all event and student details.

    Returns:
        BytesIO: A buffer containing the generated PDF.
    """

    # A4 page dimensions in PDF points.
    page_width, page_height = A4

    pdf_buffer = BytesIO()

    pdf = canvas.Canvas(
        pdf_buffer,
        pagesize=A4,
    )

    # UniGate theme colors.
    background = colors.HexColor("#0B0E1C")
    card_color = colors.HexColor("#10142E")
    purple = colors.HexColor("#7657FF")
    mint = colors.HexColor("#36DFB0")
    white = colors.HexColor("#FFFFFF")
    muted = colors.HexColor("#C0C5E2")
    divider_color = colors.HexColor("#41476C")

    # Draw the A4 background.
    pdf.setFillColor(background)
    pdf.rect(
        0,
        0,
        page_width,
        page_height,
        fill=1,
        stroke=0,
    )

    # Main ticket card.
    margin = 36
    card_x = margin
    card_y = 30
    card_width = page_width - (margin * 2)
    card_height = page_height - 60

    pdf.setFillColor(card_color)
    pdf.roundRect(
        card_x,
        card_y,
        card_width,
        card_height,
        14,
        fill=1,
        stroke=0,
    )

    left = card_x + 26
    right = card_x + card_width - 26
    content_width = right - left

    # Header.
    y = card_y + card_height - 42

    pdf.setFillColor(purple)
    pdf.roundRect(
        left,
        y - 10,
        34,
        34,
        8,
        fill=1,
        stroke=0,
    )

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawCentredString(
        left + 17,
        y + 1,
        "U",
    )

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 21)
    pdf.drawString(
        left + 46,
        y + 4,
        "UniGate",
    )

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(
        left + 46,
        y - 10,
        "UNIVERSITY EVENT PASS",
    )

    # Registration status.
    pdf.setFillColor(mint)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawRightString(
        right,
        y + 2,
        "REGISTERED",
    )

    # Header divider.
    y -= 35

    pdf.setStrokeColor(divider_color)
    pdf.setLineWidth(1)
    pdf.line(
        left,
        y,
        right,
        y,
    )

    # Event title.
    y -= 37

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 20)

    pdf.drawString(
        left,
        y,
        str(event_title or "University Event")[:42],
    )

    # Confirmation message.
    y -= 24

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 10)

    pdf.drawString(
        left,
        y,
        "Your registration has been confirmed.",
    )

    # Event date.
    y -= 39

    pdf.setFillColor(purple)
    pdf.setFont("Helvetica-Bold", 11)

    pdf.drawString(
        left,
        y,
        "EVENT DATE & TIME",
    )

    y -= 18

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 11)

    date_time = " ".join(
        str(value).strip()
        for value in (event_date, event_time)
        if value
    )

    pdf.drawString(
        left,
        y,
        date_time[:65] or "Not specified",
    )

    # Venue.
    y -= 36

    pdf.setFillColor(purple)
    pdf.setFont("Helvetica-Bold", 11)

    pdf.drawString(
        left,
        y,
        "VENUE",
    )

    y -= 18

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 11)

    pdf.drawString(
        left,
        y,
        str(venue or "Not specified")[:65],
    )

    # Student details divider.
    y -= 27

    pdf.setStrokeColor(divider_color)
    pdf.line(
        left,
        y,
        right,
        y,
    )

    # Student name.
    y -= 29

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 13)

    pdf.drawString(
        left,
        y,
        f"Student: {str(student_name or 'Student')[:40]}",
    )

    # Branch and year.
    y -= 23

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 11)

    student_academic_details = (
        f"Branch: {branch or 'N/A'}"
        f"   |   Year: {year or 'N/A'}"
    )

    pdf.drawString(
        left,
        y,
        student_academic_details[:65],
    )

    # Ticket ID.
    y -= 34

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 9)

    pdf.drawString(
        left,
        y,
        "TICKET ID",
    )

    y -= 19

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 14)

    pdf.drawString(
        left,
        y,
        str(ticket_id),
    )

    # Add a decorative divider above the QR section.
    y -= 24

    pdf.setStrokeColor(divider_color)
    pdf.line(
        left,
        y,
        right,
        y,
    )

    # Generate the actual QR code from the registration token.
    qr_buffer = generate_qr_image(qr_token)

    qr_image = ImageReader(qr_buffer)

    # Large QR code centered below all ticket details.
    # 180 PDF points is approximately 240 pixels at 96 DPI.
    qr_size = 180

    qr_x = (page_width - qr_size) / 2
    qr_y = y - 205

    # White background ensures the QR code is easy to scan.
    pdf.setFillColor(white)
    pdf.roundRect(
        qr_x - 9,
        qr_y - 9,
        qr_size + 18,
        qr_size + 18,
        8,
        fill=1,
        stroke=0,
    )

    pdf.drawImage(
        qr_image,
        qr_x,
        qr_y,
        width=qr_size,
        height=qr_size,
        preserveAspectRatio=True,
        mask="auto",
    )

    # Instructions beneath the QR code.
    pdf.setFillColor(mint)
    pdf.setFont("Helvetica-Bold", 10)

    pdf.drawCentredString(
        page_width / 2,
        qr_y - 27,
        "SCAN AT EVENT ENTRANCE",
    )

    pdf.setFillColor(muted)
    pdf.setFont("Helvetica", 9)

    pdf.drawCentredString(
        page_width / 2,
        qr_y - 43,
        "Keep this ticket ready for check-in.",
    )

    # Finalize the PDF.
    pdf.showPage()
    pdf.save()

    pdf_buffer.seek(0)

    return pdf_buffer
