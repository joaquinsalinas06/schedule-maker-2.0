"""add planned_period and linked_course_override to user_curriculum_progress

Revision ID: a7f3c2d1e8b4
Revises: cd011304f3ab
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa


revision = 'a7f3c2d1e8b4'
down_revision = 'cd011304f3ab'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('user_curriculum_progress', sa.Column('planned_period', sa.String(10), nullable=True))
    op.add_column('user_curriculum_progress', sa.Column('linked_course_override', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_progress_linked_course_override',
        'user_curriculum_progress',
        'courses',
        ['linked_course_override'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    op.drop_constraint('fk_progress_linked_course_override', 'user_curriculum_progress', type_='foreignkey')
    op.drop_column('user_curriculum_progress', 'linked_course_override')
    op.drop_column('user_curriculum_progress', 'planned_period')
