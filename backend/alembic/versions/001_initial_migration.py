"""initial migration

Revision ID: 001
Revises: None
Create Date: 2026-07-12 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    # users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('role_id', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    # vehicles table
    op.create_table(
        'vehicles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('registration_number', sa.String(), nullable=False),
        sa.Column('name_model', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('max_load_capacity', sa.Float(), nullable=False),
        sa.Column('odometer', sa.Float(), nullable=True),
        sa.Column('acquisition_cost', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('region', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('registration_number')
    )
    # drivers table
    op.create_table(
        'drivers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('license_number', sa.String(), nullable=False),
        sa.Column('license_category', sa.String(), nullable=False),
        sa.Column('license_expiry', sa.Date(), nullable=False),
        sa.Column('contact_number', sa.String(), nullable=False),
        sa.Column('safety_score', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('license_number')
    )
    # trips table
    op.create_table(
        'trips',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('destination', sa.String(), nullable=False),
        sa.Column('vehicle_id', sa.String(), nullable=False),
        sa.Column('driver_id', sa.String(), nullable=False),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('cargo_weight', sa.Float(), nullable=False),
        sa.Column('planned_distance', sa.Float(), nullable=False),
        sa.Column('actual_distance', sa.Float(), nullable=True),
        sa.Column('fuel_consumed', sa.Float(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('dispatched_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['driver_id'], ['drivers.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # maintenance_logs
    op.create_table(
        'maintenance_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('vehicle_id', sa.String(), nullable=False),
        sa.Column('maintenance_type', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('cost', sa.Float(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # fuel_logs
    op.create_table(
        'fuel_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('vehicle_id', sa.String(), nullable=False),
        sa.Column('trip_id', sa.String(), nullable=True),
        sa.Column('liters', sa.Float(), nullable=False),
        sa.Column('cost', sa.Float(), nullable=False),
        sa.Column('log_date', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # expenses
    op.create_table(
        'expenses',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('vehicle_id', sa.String(), nullable=False),
        sa.Column('trip_id', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('expense_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['trip_id'], ['trips.id'], ),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # locations
    op.create_table(
        'locations',
        sa.Column('pincode', sa.String(), nullable=False),
        sa.Column('district', sa.String(), nullable=False),
        sa.Column('state_name', sa.String(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('pincode')
    )
    # vehicle_make_catalog
    op.create_table(
        'vehicle_make_catalog',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('vehicle_type', sa.String(), nullable=False),
        sa.Column('brand', sa.String(), nullable=False),
        sa.Column('model', sa.String(), nullable=False),
        sa.Column('typical_max_load_capacity_kg', sa.Float(), nullable=False),
        sa.Column('fuel_type', sa.String(), nullable=False),
        sa.Column('min_license_category', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # maintenance_issue_catalog
    op.create_table(
        'maintenance_issue_catalog',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('issue_type', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('issue_type')
    )
    # maintenance_solution_catalog
    op.create_table(
        'maintenance_solution_catalog',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('solution', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('solution')
    )
    # driver_license_category
    op.create_table(
        'driver_license_category',
        sa.Column('category_code', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('applicable_vehicle_types', sa.String(), nullable=False),
        sa.Column('min_age', sa.Integer(), nullable=False),
        sa.Column('min_prior_experience', sa.Integer(), nullable=False),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('category_code')
    )
    # fuel_price_reference
    op.create_table(
        'fuel_price_reference',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('state', sa.String(), nullable=False),
        sa.Column('fuel_type', sa.String(), nullable=False),
        sa.Column('price_per_litre_inr', sa.Float(), nullable=False),
        sa.Column('effective_date', sa.Date(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # activity_logs
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('user_role', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=True),
        sa.Column('before_state', sa.JSON(), nullable=True),
        sa.Column('after_state', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('activity_logs')
    op.drop_table('fuel_price_reference')
    op.drop_table('driver_license_category')
    op.drop_table('maintenance_solution_catalog')
    op.drop_table('maintenance_issue_catalog')
    op.drop_table('vehicle_make_catalog')
    op.drop_table('locations')
    op.drop_table('expenses')
    op.drop_table('fuel_logs')
    op.drop_table('maintenance_logs')
    op.drop_table('trips')
    op.drop_table('drivers')
    op.drop_table('vehicles')
    op.drop_table('users')
    op.drop_table('roles')
