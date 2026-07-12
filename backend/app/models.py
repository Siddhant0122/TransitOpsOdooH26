import uuid
import enum
from datetime import datetime, date

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Date, DateTime,
    ForeignKey, Enum as SAEnum, Text, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


# ---------- Enums (mirror the mandatory business rules) ----------

class RoleName(str, enum.Enum):
    FLEET_MANAGER = "fleet_manager"
    DRIVER_ROLE = "driver_role"          # app user who dispatches trips
    SAFETY_OFFICER = "safety_officer"
    FINANCIAL_ANALYST = "financial_analyst"


class VehicleStatus(str, enum.Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    IN_SHOP = "In Shop"
    RETIRED = "Retired"


class DriverStatus(str, enum.Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    OFF_DUTY = "Off Duty"
    SUSPENDED = "Suspended"


class TripStatus(str, enum.Enum):
    DRAFT = "Draft"
    DISPATCHED = "Dispatched"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class MaintenanceStatus(str, enum.Enum):
    OPEN = "Open"        # active -> vehicle forced to In Shop
    CLOSED = "Closed"    # closed -> vehicle restored (unless retired)


class ExpenseCategory(str, enum.Enum):
    TOLL = "Toll"
    MAINTENANCE = "Maintenance"
    OTHER = "Other"


# ---------- Core entities ----------

class Role(Base):
    __tablename__ = "roles"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(SAEnum(RoleName), unique=True, nullable=False)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="users")
    trips_created = relationship("Trip", back_populates="creator")


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(String, primary_key=True, default=gen_uuid)
    registration_number = Column(String, unique=True, nullable=False, index=True)
    name_model = Column(String, nullable=False)
    type = Column(String, nullable=False)          # e.g. Truck, Van, Bike
    max_load_capacity = Column(Float, nullable=False)   # kg
    odometer = Column(Float, default=0.0)
    acquisition_cost = Column(Float, nullable=False)
    status = Column(SAEnum(VehicleStatus), default=VehicleStatus.AVAILABLE, nullable=False)
    region = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trips = relationship("Trip", back_populates="vehicle")
    maintenance_logs = relationship("MaintenanceLog", back_populates="vehicle")
    fuel_logs = relationship("FuelLog", back_populates="vehicle")
    expenses = relationship("Expense", back_populates="vehicle")


class Driver(Base):
    __tablename__ = "drivers"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    license_number = Column(String, unique=True, nullable=False)
    license_category = Column(String, nullable=False)
    license_expiry = Column(Date, nullable=False)
    contact_number = Column(String, nullable=False)
    safety_score = Column(Integer, default=100)
    status = Column(SAEnum(DriverStatus), default=DriverStatus.AVAILABLE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    trips = relationship("Trip", back_populates="driver")

    @property
    def license_valid(self) -> bool:
        return self.license_expiry >= date.today()


class Trip(Base):
    __tablename__ = "trips"
    id = Column(String, primary_key=True, default=gen_uuid)
    source = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    cargo_weight = Column(Float, nullable=False)          # kg
    planned_distance = Column(Float, nullable=False)      # km
    actual_distance = Column(Float, nullable=True)
    fuel_consumed = Column(Float, nullable=True)           # liters, set on completion
    status = Column(SAEnum(TripStatus), default=TripStatus.DRAFT, nullable=False)
    dispatched_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    creator = relationship("User", back_populates="trips_created")
    fuel_logs = relationship("FuelLog", back_populates="trip")
    expenses = relationship("Expense", back_populates="trip")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    id = Column(String, primary_key=True, default=gen_uuid)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    maintenance_type = Column(String, nullable=False)     # e.g. Oil Change
    description = Column(Text, nullable=True)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    cost = Column(Float, default=0.0)
    status = Column(SAEnum(MaintenanceStatus), default=MaintenanceStatus.OPEN, nullable=False)

    vehicle = relationship("Vehicle", back_populates="maintenance_logs")


class FuelLog(Base):
    __tablename__ = "fuel_logs"
    id = Column(String, primary_key=True, default=gen_uuid)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    trip_id = Column(String, ForeignKey("trips.id"), nullable=True)
    liters = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    log_date = Column(Date, default=date.today)

    vehicle = relationship("Vehicle", back_populates="fuel_logs")
    trip = relationship("Trip", back_populates="fuel_logs")


class Expense(Base):
    __tablename__ = "expenses"
    id = Column(String, primary_key=True, default=gen_uuid)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    trip_id = Column(String, ForeignKey("trips.id"), nullable=True)
    category = Column(SAEnum(ExpenseCategory), default=ExpenseCategory.OTHER, nullable=False)
    amount = Column(Float, nullable=False)
    expense_date = Column(Date, default=date.today)
    notes = Column(String, nullable=True)

    vehicle = relationship("Vehicle", back_populates="expenses")
    trip = relationship("Trip", back_populates="expenses")


# ---------- Reference Data Catalog Tables ----------

class Location(Base):
    __tablename__ = "locations"
    pincode = Column(String, primary_key=True)
    district = Column(String, nullable=False)
    state_name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)


class VehicleMakeCatalog(Base):
    __tablename__ = "vehicle_make_catalog"
    id = Column(String, primary_key=True, default=gen_uuid)
    vehicle_type = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    model = Column(String, nullable=False)
    typical_max_load_capacity_kg = Column(Float, nullable=False)
    fuel_type = Column(String, nullable=False)
    min_license_category = Column(String, nullable=False)


class MaintenanceIssueCatalog(Base):
    __tablename__ = "maintenance_issue_catalog"
    id = Column(String, primary_key=True, default=gen_uuid)
    issue_type = Column(String, unique=True, nullable=False)


class MaintenanceSolutionCatalog(Base):
    __tablename__ = "maintenance_solution_catalog"
    id = Column(String, primary_key=True, default=gen_uuid)
    solution = Column(String, unique=True, nullable=False)


class DriverLicenseCategory(Base):
    __tablename__ = "driver_license_category"
    category_code = Column(String, primary_key=True)
    description = Column(String, nullable=False)
    applicable_vehicle_types = Column(String, nullable=False)
    min_age = Column(Integer, nullable=False)
    min_prior_experience = Column(Integer, nullable=False)
    notes = Column(String, nullable=True)


class FuelPriceReference(Base):
    __tablename__ = "fuel_price_reference"
    id = Column(String, primary_key=True, default=gen_uuid)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    fuel_type = Column(String, nullable=False)
    price_per_litre_inr = Column(Float, nullable=False)
    effective_date = Column(Date, nullable=False)


# ---------- Audit Trail / Activity Log ----------

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    user_role = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")

