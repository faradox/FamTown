"""add_accounting_tables

Revision ID: a1b2c3d4e5f6
Revises: 68bb3635a33b
Create Date: 2026-01-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '68bb3635a33b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_exists(conn, index_name: str) -> bool:
    """Check if an index exists."""
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_indexes WHERE indexname = :name"
    ), {"name": index_name})
    return result.fetchone() is not None


def _table_exists(conn, table_name: str) -> bool:
    """Check if a table exists."""
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables WHERE table_name = :name"
    ), {"name": table_name})
    return result.fetchone() is not None


def upgrade() -> None:
    """Create accounting tables."""
    conn = op.get_bind()

    # Create accounting_categories table (global, not per-user)
    if not _table_exists(conn, 'accounting_categories'):
        op.create_table(
            'accounting_categories',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('type', sa.String(10), nullable=False),
            sa.Column('parentId', sa.String(), nullable=True),
            sa.Column('icon', sa.String(50), nullable=True),
            sa.Column('color', sa.String(7), nullable=True),
            sa.Column('sortOrder', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('isDefault', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['parentId'], ['accounting_categories.id'], ondelete='RESTRICT'),
            sa.CheckConstraint("type IN ('income', 'expense')", name='ck_accounting_categories_type'),
        )
        op.create_index('idx_accounting_categories_parent', 'accounting_categories', ['parentId'])
        op.create_index('idx_accounting_categories_type', 'accounting_categories', ['type'])

    # Create accounting_templates table (per-user)
    if not _table_exists(conn, 'accounting_templates'):
        op.create_table(
            'accounting_templates',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('entryType', sa.String(10), nullable=False),
            sa.Column('amount', sa.Numeric(12, 2), nullable=True),
            sa.Column('categoryId', sa.String(), nullable=False),
            sa.Column('description', sa.String(500), nullable=True),
            sa.Column('userId', sa.String(), nullable=False),
            sa.Column('sortOrder', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['categoryId'], ['accounting_categories.id'], ondelete='RESTRICT'),
            sa.ForeignKeyConstraint(['userId'], ['users.id'], ondelete='CASCADE'),
            sa.CheckConstraint("\"entryType\" IN ('income', 'expense')", name='ck_accounting_templates_entry_type'),
            sa.UniqueConstraint('name', 'userId', name='uq_accounting_templates_name_user'),
        )
        op.create_index('idx_accounting_templates_user', 'accounting_templates', ['userId'])

    # Create accounting_entries table (per-user for tracking who entered)
    if not _table_exists(conn, 'accounting_entries'):
        op.create_table(
            'accounting_entries',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('entryType', sa.String(10), nullable=False),
            sa.Column('amount', sa.Numeric(12, 2), nullable=False),
            sa.Column('categoryId', sa.String(), nullable=False),
            sa.Column('description', sa.String(500), nullable=True),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('userId', sa.String(), nullable=False),
            sa.Column('templateId', sa.String(), nullable=True),
            sa.Column('accountId', sa.String(), nullable=True),
            sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updatedAt', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['categoryId'], ['accounting_categories.id'], ondelete='RESTRICT'),
            sa.ForeignKeyConstraint(['userId'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['templateId'], ['accounting_templates.id'], ondelete='SET NULL'),
            sa.CheckConstraint("\"entryType\" IN ('income', 'expense')", name='ck_accounting_entries_entry_type'),
            sa.CheckConstraint('amount > 0', name='ck_accounting_entries_amount_positive'),
        )
        op.create_index('idx_accounting_entries_user', 'accounting_entries', ['userId'])
        op.create_index('idx_accounting_entries_date', 'accounting_entries', ['date'])
        op.create_index('idx_accounting_entries_category', 'accounting_entries', ['categoryId'])
        op.create_index('idx_accounting_entries_type_date', 'accounting_entries', ['entryType', 'date'])


def downgrade() -> None:
    """Drop accounting tables."""
    conn = op.get_bind()

    # Drop entries table first (depends on templates and categories)
    if _table_exists(conn, 'accounting_entries'):
        if _index_exists(conn, 'idx_accounting_entries_type_date'):
            op.drop_index('idx_accounting_entries_type_date', 'accounting_entries')
        if _index_exists(conn, 'idx_accounting_entries_category'):
            op.drop_index('idx_accounting_entries_category', 'accounting_entries')
        if _index_exists(conn, 'idx_accounting_entries_date'):
            op.drop_index('idx_accounting_entries_date', 'accounting_entries')
        if _index_exists(conn, 'idx_accounting_entries_user'):
            op.drop_index('idx_accounting_entries_user', 'accounting_entries')
        op.drop_table('accounting_entries')

    # Drop templates table (depends on categories)
    if _table_exists(conn, 'accounting_templates'):
        if _index_exists(conn, 'idx_accounting_templates_user'):
            op.drop_index('idx_accounting_templates_user', 'accounting_templates')
        op.drop_table('accounting_templates')

    # Drop categories table last
    if _table_exists(conn, 'accounting_categories'):
        if _index_exists(conn, 'idx_accounting_categories_type'):
            op.drop_index('idx_accounting_categories_type', 'accounting_categories')
        if _index_exists(conn, 'idx_accounting_categories_parent'):
            op.drop_index('idx_accounting_categories_parent', 'accounting_categories')
        op.drop_table('accounting_categories')
