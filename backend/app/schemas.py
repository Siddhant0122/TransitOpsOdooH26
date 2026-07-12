from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

from app.models import RoleName, VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus, ExpenseCategory


# ---------- Auth ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: RoleName


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: RoleName
    is_active: bool

    class Config:
        from_attributes = True


# ---------- Vehicle ----------

class VehicleCreate(BaseModel):
    registration_number: str
    name_model: str
    type: str
    max_load_capacity: float = Field(gt=0)
    odometer: float = 0.0
    acquisition_cost: float = Field(ge=0)
    region: Optional[str] = None
    documents: Optional[List[Any]] = None


class VehicleUpdate(BaseModel):
    name_model: Optional[str] = None
    type: Optional[str] = None
    max_load_capacity: Optional[float] = None
    odometer: Optional[float] = None
    acquisition_cost: Optional[float] = None
    status: Optional[VehicleStatus] = None
    region: Optional[str] = None
    documents: Optional[List[Any]] = None


class VehicleOut(BaseModel):
    id: str
    registration_number: str
    name_model: str
    type: str
    max_load_capacity: float
    odometer: float
    acquisition_cost: float
    status: VehicleStatus
    region: Optional[str]
    documents: Optional[List[Any]] = None

    class Config:
        from_attributes = True


# ---------- Driver ----------

class DriverCreate(BaseModel):
    name: str
    license_number: str
    license_category: str
    license_expiry: date
    contact_number: str
    safety_score: int = 100


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry: Optional[date] = None
    contact_number: Optional[str] = None
    safety_score: Optional[int] = None
    status: Optional[DriverStatus] = None


class DriverOut(BaseModel):
    id: str
    name: str
    license_number: str
    license_category: str
    license_expiry: date
    contact_number: str
    safety_score: int
    status: DriverStatus

    class Config:
        from_attributes = True


# ---------- Trip ----------

class TripCreate(BaseModel):
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight: float = Field(gt=0)
    planned_distance: float = Field(gt=0)


class TripCompleteRequest(BaseModel):
    final_odometer: float
    fuel_consumed: float = Field(ge=0)


class TripOut(BaseModel):
    id: str
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight: float
    planned_distance: float
    actual_distance: Optional[float]
    fuel_consumed: Optional[float]
    status: TripStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Maintenance ----------

class MaintenanceCreate(BaseModel):
    vehicle_id: str
    maintenance_type: str
    description: Optional[str] = None
    cost: float = 0.0


class MaintenanceOut(BaseModel):
    id: str
    vehicle_id: str
    maintenance_type: str
    start_date: date
    end_date: Optional[date]
    cost: float
    status: MaintenanceStatus

    class Config:
        from_attributes = True


# ---------- Fuel & Expense ----------

class FuelLogCreate(BaseModel):
    vehicle_id: str
    trip_id: Optional[str] = None
    liters: float = Field(gt=0)
    cost: float = Field(ge=0)
    log_date: date = Field(default_factory=date.today)


class FuelLogOut(BaseModel):
    id: str
    vehicle_id: str
    trip_id: Optional[str]
    liters: float
    cost: float
    log_date: date

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    vehicle_id: str
    trip_id: Optional[str] = None
    category: ExpenseCategory = ExpenseCategory.OTHER
    amount: float = Field(ge=0)
    expense_date: date = Field(default_factory=date.today)
    notes: Optional[str] = None


class ExpenseOut(BaseModel):
    id: str
    vehicle_id: str
    trip_id: Optional[str]
    category: ExpenseCategory
    amount: float
    expense_date: date
    notes: Optional[str]

    class Config:
        from_attributes = True


# ---------- Dashboard ----------

class DashboardKPIs(BaseModel):
    active_vehicles: int
    available_vehicles: int
    vehicles_in_maintenance: int
    active_trips: int
    pending_trips: int
    drivers_on_duty: int
    fleet_utilization_pct: float


# ---------- Reference Locations ----------

class LocationCreate(BaseModel):
    pincode: str
    district: str
    state_name: str
    latitude: float
    longitude: float


class LocationOut(BaseModel):
    pincode: str
    district: str
    state_name: str
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


# ---------- Vehicle Make Catalog ----------

class VehicleMakeCatalogCreate(BaseModel):
    vehicle_type: str
    brand: str
    model: str
    typical_max_load_capacity_kg: float
    fuel_type: str
    min_license_category: str


class VehicleMakeCatalogOut(BaseModel):
    id: str
    vehicle_type: str
    brand: str
    model: str
    typical_max_load_capacity_kg: float
    fuel_type: str
    min_license_category: str

    class Config:
        from_attributes = True


# ---------- Maintenance Issue Catalog ----------

class MaintenanceIssueCatalogCreate(BaseModel):
    issue_type: str


class MaintenanceIssueCatalogOut(BaseModel):
    id: str
    issue_type: str

    class Config:
        from_attributes = True


# ---------- Maintenance Solution Catalog ----------

class MaintenanceSolutionCatalogCreate(BaseModel):
    solution: str


class MaintenanceSolutionCatalogOut(BaseModel):
    id: str
    solution: str

    class Config:
        from_attributes = True


# ---------- Driver License Category ----------

class DriverLicenseCategoryCreate(BaseModel):
    category_code: str
    description: str
    applicable_vehicle_types: str
    min_age: int
    min_prior_experience: int
    notes: Optional[str] = None


class DriverLicenseCategoryOut(BaseModel):
    category_code: str
    description: str
    applicable_vehicle_types: str
    min_age: int
    min_prior_experience: int
    notes: Optional[str]

    class Config:
        from_attributes = True


# ---------- Fuel Price Reference ----------

class FuelPriceReferenceCreate(BaseModel):
    city: str
    state: str
    fuel_type: str
    price_per_litre_inr: float
    effective_date: date


class FuelPriceReferenceOut(BaseModel):
    id: str
    city: str
    state: str
    fuel_type: str
    price_per_litre_inr: float
    effective_date: date

    class Config:
        from_attributes = True


# ---------- Activity Log ----------

class ActivityLogOut(BaseModel):
    id: str
    user_id: Optional[str]
    user_role: Optional[str]
    action: str
    entity_type: str
    entity_id: Optional[str]
    before_state: Optional[dict]
    after_state: Optional[dict]
    ip_address: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

