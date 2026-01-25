"""add_itemmetadata_to_townsquare_items

Revision ID: 68bb3635a33b
Revises: 
Create Date: 2025-10-10 12:01:25.447903

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '68bb3635a33b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('townsquare_items')]

    if 'itemMetadata' not in columns:
        op.add_column('townsquare_items', sa.Column('itemMetadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('townsquare_items')]

    if 'itemMetadata' in columns:
        op.drop_column('townsquare_items', 'itemMetadata')
