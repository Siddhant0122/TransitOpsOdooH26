import math
from datetime import date, datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.repositories import repositories as repo

# --- License category rank checker ---
LICENSE_RANKS = {
    "LMV-TR": 1,
    "HMV": 2,
    "HGMV": 3
}

def is_license_compatible(driver_license: str, vehicle_min_license: str) -> bool:
    d_rank = LICENSE_RANKS.get(driver_license, 0)
    v_rank = LICENSE_RANKS.get(vehicle_min_license, 0)
    return d_rank >= v_rank


# --- Haversine Distance helper ---
def compute_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Radius of Earth in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


class VehicleService:
    def __init__(self):
        self.vehicle_repo = repo.VehicleRepository()
        self.catalog_repo = repo.VehicleMakeCatalogRepository()

    def get_vehicle(self, db: Session, vehicle_id: str) -> models.Vehicle:
        v = self.vehicle_repo.get(db, vehicle_id)
        if not v:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return v

    def list_vehicles(self, db: Session, status_filter=None, type_filter=None, region=None) -> List[models.Vehicle]:
        q = db.query(models.Vehicle)
        if status_filter:
            q = q.filter(models.Vehicle.status == status_filter)
        if type_filter:
            q = q.filter(models.Vehicle.type == type_filter)
        if region:
            q = q.filter(models.Vehicle.region == region)
        return q.all()

    def create_vehicle(self, db: Session, payload: schemas.VehicleCreate) -> models.Vehicle:
        # Enforce unique registration number
        if self.vehicle_repo.get_by_registration(db, payload.registration_number):
            raise HTTPException(status_code=400, detail="Registration number must be unique")
        
        # Enforce vehicle type exists in VehicleMakeCatalog
        db_catalogs = db.query(models.VehicleMakeCatalog).filter(
            models.VehicleMakeCatalog.vehicle_type == payload.type
        ).all()
        if not db_catalogs and payload.type not in ["three-wheeler cargo", "mini truck", "pickup", "light truck", "medium truck", "heavy truck", "container truck"]:
            raise HTTPException(status_code=400, detail=f"Vehicle type '{payload.type}' is not recognized in catalog")

        v = models.Vehicle(**payload.model_dump())
        return self.vehicle_repo.create(db, v)

    def update_vehicle(self, db: Session, vehicle_id: str, payload: schemas.VehicleUpdate) -> models.Vehicle:
        v = self.get_vehicle(db, vehicle_id)
        return self.vehicle_repo.update(db, v, payload.model_dump(exclude_unset=True))

    def retire_vehicle(self, db: Session, vehicle_id: str) -> None:
        v = self.get_vehicle(db, vehicle_id)
        v.status = models.VehicleStatus.RETIRED
        db.commit()


class DriverService:
    def __init__(self):
        self.driver_repo = repo.DriverRepository()

    def get_driver(self, db: Session, driver_id: str) -> models.Driver:
        d = self.driver_repo.get(db, driver_id)
        if not d:
            raise HTTPException(status_code=404, detail="Driver not found")
        return d

    def list_drivers(self, db: Session, status_filter=None) -> List[models.Driver]:
        q = db.query(models.Driver)
        if status_filter:
            q = q.filter(models.Driver.status == status_filter)
        return q.all()

    def create_driver(self, db: Session, payload: schemas.DriverCreate) -> models.Driver:
        # Enforce license unique constraints
        if self.driver_repo.get_by_license(db, payload.license_number):
            raise HTTPException(status_code=400, detail="License number already registered")

        d = models.Driver(**payload.model_dump())
        return self.driver_repo.create(db, d)

    def update_driver(self, db: Session, driver_id: str, payload: schemas.DriverUpdate) -> models.Driver:
        d = self.get_driver(db, driver_id)
        return self.driver_repo.update(db, d, payload.model_dump(exclude_unset=True))

    def suspend_driver(self, db: Session, driver_id: str) -> None:
        d = self.get_driver(db, driver_id)
        d.status = models.DriverStatus.SUSPENDED
        db.commit()


class TripService:
    def __init__(self):
        self.trip_repo = repo.TripRepository()
        self.vehicle_repo = repo.VehicleRepository()
        self.driver_repo = repo.DriverRepository()
        self.location_repo = repo.LocationRepository()
        self.catalog_repo = repo.VehicleMakeCatalogRepository()

    def list_trips(self, db: Session) -> List[models.Trip]:
        return self.trip_repo.list(db)

    def calculate_distance(self, db: Session, source_pincode: str, dest_pincode: str) -> float:
        source_loc = self.location_repo.get(db, source_pincode)
        dest_loc = self.location_repo.get(db, dest_pincode)
        if not source_loc or not dest_loc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid pincodes: source {source_pincode} or destination {dest_pincode} not found"
            )
        return compute_haversine_distance(
            source_loc.latitude, source_loc.longitude,
            dest_loc.latitude, dest_loc.longitude
        )

    def create_trip(self, db: Session, payload: schemas.TripCreate, creator_id: str) -> models.Trip:
        # 1. Pincodes must exist in locations reference table
        source_loc = self.location_repo.get(db, payload.source)
        dest_loc = self.location_repo.get(db, payload.destination)
        if not source_loc:
            raise HTTPException(status_code=400, detail=f"Source pincode {payload.source} does not exist in reference data")
        if not dest_loc:
            raise HTTPException(status_code=400, detail=f"Destination pincode {payload.destination} does not exist in reference data")

        # 2. Get entities
        v = self.vehicle_repo.get(db, payload.vehicle_id)
        d = self.driver_repo.get(db, payload.driver_id)
        if not v:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        if not d:
            raise HTTPException(status_code=404, detail="Driver not found")

        # 3. Check assets are Available
        if v.status != models.VehicleStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail=f"Vehicle is '{v.status.value}', must be Available")
        if d.status != models.DriverStatus.AVAILABLE:
            raise HTTPException(status_code=400, detail=f"Driver status is '{d.status.value}', must be Available")
        if d.license_expiry < date.today():
            raise HTTPException(status_code=400, detail="Driver's license has expired")

        # 4. Check Cargo Capacity
        if payload.cargo_weight > v.max_load_capacity:
            raise HTTPException(
                status_code=400,
                detail=f"Cargo weight {payload.cargo_weight}kg exceeds vehicle capacity {v.max_load_capacity}kg"
            )

        # 5. Check License compatibility
        # Sourced from VehicleMakeCatalog corresponding to vehicle.type
        cat_matches = db.query(models.VehicleMakeCatalog).filter(
            models.VehicleMakeCatalog.vehicle_type == v.type
        ).all()
        # Fallback if catalog not seeded yet: mini truck / pickup / LMV-TR, HMV, etc.
        min_license = "LMV-TR"
        if cat_matches:
            min_license = cat_matches[0].min_license_category
        else:
            # Simple fallback defaults
            if "medium" in v.type.lower() or "ultra" in v.name_model.lower():
                min_license = "HMV"
            elif "heavy" in v.type.lower() or "container" in v.type.lower():
                min_license = "HGMV"

        if not is_license_compatible(d.license_category, min_license):
            raise HTTPException(
                status_code=400,
                detail=f"Driver license '{d.license_category}' incompatible with vehicle required license '{min_license}'"
            )

        # 6. Auto-calculate distance if not explicitly provided or to validate
        calculated_dist = compute_haversine_distance(
            source_loc.latitude, source_loc.longitude,
            dest_loc.latitude, dest_loc.longitude
        )

        trip = models.Trip(
            source=payload.source,
            destination=payload.destination,
            vehicle_id=payload.vehicle_id,
            driver_id=payload.driver_id,
            created_by=creator_id,
            cargo_weight=payload.cargo_weight,
            planned_distance=payload.planned_distance or calculated_dist,
            status=models.TripStatus.DRAFT,
        )
        return self.trip_repo.create(db, trip)

    def dispatch_trip(self, db: Session, trip_id: str) -> models.Trip:
        trip = self.trip_repo.get(db, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.status != models.TripStatus.DRAFT:
            raise HTTPException(status_code=400, detail=f"Cannot dispatch trip in '{trip.status.value}' status")

        v = trip.vehicle
        d = trip.driver

        # Double check availability (concurrency safety)
        if v.status != models.VehicleStatus.AVAILABLE:
            raise HTTPException(status_code=409, detail="Vehicle is no longer available")
        if d.status != models.DriverStatus.AVAILABLE:
            raise HTTPException(status_code=409, detail="Driver is no longer available")
        if d.license_expiry < date.today():
            raise HTTPException(status_code=400, detail="Driver license expired since drafting")

        # Double check driver license category hierarchy
        cat_matches = db.query(models.VehicleMakeCatalog).filter(
            models.VehicleMakeCatalog.vehicle_type == v.type
        ).all()
        min_license = "LMV-TR"
        if cat_matches:
            min_license = cat_matches[0].min_license_category
        else:
            if "medium" in v.type.lower() or "ultra" in v.name_model.lower():
                min_license = "HMV"
            elif "heavy" in v.type.lower() or "container" in v.type.lower():
                min_license = "HGMV"

        if not is_license_compatible(d.license_category, min_license):
            raise HTTPException(
                status_code=400,
                detail=f"Driver license '{d.license_category}' incompatible with vehicle required license '{min_license}'"
            )

        trip.status = models.TripStatus.DISPATCHED
        trip.dispatched_at = datetime.utcnow()
        v.status = models.VehicleStatus.ON_TRIP
        d.status = models.DriverStatus.ON_TRIP

        db.commit()
        db.refresh(trip)
        return trip

    def complete_trip(self, db: Session, trip_id: str, payload: schemas.TripCompleteRequest) -> models.Trip:
        trip = self.trip_repo.get(db, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.status != models.TripStatus.DISPATCHED:
            raise HTTPException(status_code=400, detail=f"Cannot complete trip in '{trip.status.value}' status")

        v = trip.vehicle
        d = trip.driver

        if payload.final_odometer < v.odometer:
            raise HTTPException(
                status_code=400,
                detail=f"Final odometer {payload.final_odometer} cannot be less than vehicle current odometer {v.odometer}"
            )

        distance_travelled = payload.final_odometer - v.odometer
        trip.actual_distance = max(distance_travelled, 0.0)
        trip.fuel_consumed = payload.fuel_consumed
        trip.status = models.TripStatus.COMPLETED
        trip.completed_at = datetime.utcnow()

        v.odometer = payload.final_odometer
        v.status = models.VehicleStatus.AVAILABLE
        d.status = models.DriverStatus.AVAILABLE

        # Auto-create fuel log (if fuel consumed was entered and is > 0)
        if payload.fuel_consumed > 0:
            # Try to get fuel price snap to calculate cost, else fallback to 0.0
            fuel_price_ref = db.query(models.FuelPriceReference).filter(
                models.FuelPriceReference.fuel_type == "Diesel" # default
            ).first()
            price_per_l = fuel_price_ref.price_per_litre_inr if fuel_price_ref else 90.0
            cost = round(payload.fuel_consumed * price_per_l, 2)
            
            db.add(models.FuelLog(
                vehicle_id=v.id,
                trip_id=trip.id,
                liters=payload.fuel_consumed,
                cost=cost,
                log_date=date.today()
            ))

        db.commit()
        db.refresh(trip)
        return trip

    def cancel_trip(self, db: Session, trip_id: str) -> models.Trip:
        trip = self.trip_repo.get(db, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        if trip.status not in (models.TripStatus.DRAFT, models.TripStatus.DISPATCHED):
            raise HTTPException(status_code=400, detail=f"Cannot cancel trip in '{trip.status.value}' status")

        was_dispatched = (trip.status == models.TripStatus.DISPATCHED)
        trip.status = models.TripStatus.CANCELLED

        if was_dispatched:
            trip.vehicle.status = models.VehicleStatus.AVAILABLE
            trip.driver.status = models.DriverStatus.AVAILABLE

        db.commit()
        db.refresh(trip)
        return trip


class MaintenanceService:
    def __init__(self):
        self.maint_repo = repo.MaintenanceRepository()
        self.vehicle_repo = repo.VehicleRepository()

    def list_logs(self, db: Session) -> List[models.MaintenanceLog]:
        return self.maint_repo.list(db)

    def create_log(self, db: Session, payload: schemas.MaintenanceCreate) -> models.MaintenanceLog:
        v = self.vehicle_repo.get(db, payload.vehicle_id)
        if not v:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        if v.status == models.VehicleStatus.ON_TRIP:
            raise HTTPException(status_code=400, detail="Cannot service a vehicle that is currently On Trip")

        # Create maintenance issue catalog validation
        issues_catalog = db.query(models.MaintenanceIssueCatalog).filter(
            models.MaintenanceIssueCatalog.issue_type == payload.maintenance_type
        ).first()
        # Log warning if missing but allow for flexibility
        
        log = models.MaintenanceLog(
            vehicle_id=payload.vehicle_id,
            maintenance_type=payload.maintenance_type,
            description=payload.description,
            cost=payload.cost,
            status=models.MaintenanceStatus.OPEN
        )
        db.add(log)
        
        # Set vehicle to In Shop
        v.status = models.VehicleStatus.IN_SHOP
        db.commit()
        db.refresh(log)
        return log

    def close_log(self, db: Session, log_id: str, solution: Optional[str] = None) -> models.MaintenanceLog:
        log = self.maint_repo.get(db, log_id)
        if not log:
            raise HTTPException(status_code=404, detail="Maintenance log not found")
        if log.status == models.MaintenanceStatus.CLOSED:
            raise HTTPException(status_code=400, detail="Maintenance log already closed")

        log.status = models.MaintenanceStatus.CLOSED
        log.end_date = date.today()
        if solution:
            log.description = f"{log.description or ''} | Resolution: {solution}".strip(" | ")

        # Restores vehicle to Available unless retired or other open logs exist
        other_open = self.maint_repo.get_open_logs_for_vehicle(db, log.vehicle_id)
        # Exclude self
        other_open = [o for o in other_open if o.id != log.id]

        if not other_open and log.vehicle.status != models.VehicleStatus.RETIRED:
            log.vehicle.status = models.VehicleStatus.AVAILABLE

        db.commit()
        db.refresh(log)
        return log


class FuelExpenseService:
    def __init__(self):
        self.fuel_repo = repo.FuelLogRepository()
        self.exp_repo = repo.ExpenseRepository()
        self.vehicle_repo = repo.VehicleRepository()

    def create_fuel_log(self, db: Session, payload: schemas.FuelLogCreate) -> models.FuelLog:
        if not self.vehicle_repo.get(db, payload.vehicle_id):
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        # Pre-fill cost calculation using Reference Fuel Prices if cost is not specified or 0
        if payload.cost == 0:
            v = self.vehicle_repo.get(db, payload.vehicle_id)
            # Find fuel price reference in vehicle's region
            price_ref = None
            if v.region:
                price_ref = db.query(models.FuelPriceReference).filter(
                    models.FuelPriceReference.state == v.region
                ).first()
            if not price_ref:
                price_ref = db.query(models.FuelPriceReference).first()
            
            price_per_l = price_ref.price_per_litre_inr if price_ref else 90.0
            cost = payload.liters * price_per_l
        else:
            cost = payload.cost

        log = models.FuelLog(
            vehicle_id=payload.vehicle_id,
            trip_id=payload.trip_id,
            liters=payload.liters,
            cost=cost,
            log_date=payload.log_date
        )
        return self.fuel_repo.create(db, log)

    def create_expense(self, db: Session, payload: schemas.ExpenseCreate) -> models.Expense:
        if not self.vehicle_repo.get(db, payload.vehicle_id):
            raise HTTPException(status_code=404, detail="Vehicle not found")
        
        expense = models.Expense(**payload.model_dump())
        return self.exp_repo.create(db, expense)
