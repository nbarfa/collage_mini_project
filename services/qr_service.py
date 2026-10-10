from io import BytesIO

import qrcode
from qrcode.constants import ERROR_CORRECT_M


def generate_qr_image(token):
    """
    Generate a PNG QR code image for a registration token.

    Args:
        token: The unique token belonging to a registration.

    Returns:
        BytesIO: An in-memory PNG image buffer.
    """
    if not token:
        raise ValueError("A valid QR token is required.")

    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(token)
    qr.make(fit=True)

    image = qr.make_image(
        fill_color="black",
        back_color="white",
    )

    image_buffer = BytesIO()
    image.save(image_buffer, format="PNG")
    image_buffer.seek(0)

    return image_buffer
