
"""Add email verification field

Revision ID: 9a1fd528cd77
Revises:
Create Date: 2026-10-25 20:33:37.190060
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "9a1fd528cd77"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "is_email_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # Keep existing accounts usable.
    op.execute(
        sa.text(
            "UPDATE users SET is_email_verified = TRUE"
        )
    )

    # Remove the database default after existing rows are handled.
    op.alter_column(
        "users",
        "is_email_verified",
        server_default=None,
    )


def downgrade():
    op.drop_column("users", "is_email_verified")
