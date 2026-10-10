import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")

    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8  # 8 hours

    ALLOWED_EMAIL_DOMAIN = os.environ.get(
        "ALLOWED_EMAIL_DOMAIN",
        "@ipsacademy.org"
    )
