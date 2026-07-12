from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.base import BaseRepository
from app import models

class VehicleRepository(BaseRepository[models.Vehicle]):
    def __init__(self):
        super().__init__(models.Vehicle)

    def get_by_registration(self, db: Session, registration_number: str) -> Optional[models.Vehicle]:
        return db.query(models.Vehicle).filter(models.Vehicle.registration_number == registration_number).first()

    def get_available_vehicles(self, db: Session) -> List[models.Vehicle]:
        return db.query(models.Vehicle).filter(models.Vehicle.status == models.VehicleStatus.AVAILABLE).all()


class DriverRepository(BaseRepository[models.Driver]):
    def __init__(self):
        super().__init__(models.Driver)

    def get_by_license(self, db: Session, license_number: str) -> Optional[models.Driver]:
        return db.query(models.Driver).filter(models.Driver.license_number == license_number).first()

    def get_available_drivers(self, db: Session) -> List[models.Driver]:
        import datetime
        return (
            db.query(models.Driver)
            .filter(models.Driver.status == models.DriverStatus.AVAILABLE)
            .filter(models.Driver.license_expiry >= datetime.date.today())
            .all()
        )


class TripRepository(BaseRepository[models.Trip]):
    def __init__(self):
        super().__init__(models.Trip)

    def get_active_trips(self, db: Session) -> List[models.Trip]:
        return db.query(models.Trip).filter(models.Trip.status == models.TripStatus.DISPATCHED).all()


class MaintenanceRepository(BaseRepository[models.MaintenanceLog]):
    def __init__(self):
        super().__init__(models.MaintenanceLog)

    def get_open_logs(self, db: Session) -> List[models.MaintenanceLog]:
        return db.query(models.MaintenanceLog).filter(models.MaintenanceLog.status == models.MaintenanceStatus.OPEN).all()

    def get_open_logs_for_vehicle(self, db: Session, vehicle_id: str) -> List[models.MaintenanceLog]:
        return (
            db.query(models.MaintenanceLog)
            .filter(models.MaintenanceLog.vehicle_id == vehicle_id)
            .filter(models.MaintenanceLog.status == models.MaintenanceStatus.OPEN)
            .all()
        )


class FuelLogRepository(BaseRepository[models.FuelLog]):
    def __init__(self):
        super().__init__(models.FuelLog)


class ExpenseRepository(BaseRepository[models.Expense]):
    def __init__(self):
        super().__init__(models.Expense)


class LocationRepository(BaseRepository[models.Location]):
    def __init__(self):
        super().__init__(models.Location)

    def get(self, db: Session, pincode: str) -> Optional[models.Location]:
        return db.query(models.Location).filter(models.Location.pincode == pincode).first()


class VehicleMakeCatalogRepository(BaseRepository[models.VehicleMakeCatalog]):
    def __init__(self):
        super().__init__(models.VehicleMakeCatalog)

    def get_by_brand_model(self, db: Session, brand: str, model: str) -> Optional[models.VehicleMakeCatalog]:
        return (
            db.query(models.VehicleMakeCatalog)
            .filter(models.VehicleMakeCatalog.brand == brand, models.VehicleMakeCatalog.model == model)
            .first()
        )


class MaintenanceIssueCatalogRepository(BaseRepository[models.MaintenanceIssueCatalog]):
    def __init__(self):
        super().__init__(models.MaintenanceIssueCatalog)


class MaintenanceSolutionCatalogRepository(BaseRepository[models.MaintenanceSolutionCatalog]):
    def __init__(self):
        super().__init__(models.MaintenanceSolutionCatalog)


class DriverLicenseCategoryRepository(BaseRepository[models.DriverLicenseCategory]):
    def __init__(self):
        super().__init__(models.DriverLicenseCategory)

    def get(self, db: Session, category_code: str) -> Optional[models.DriverLicenseCategory]:
        return db.query(models.DriverLicenseCategory).filter(models.DriverLicenseCategory.category_code == category_code).first()


class FuelPriceReferenceRepository(BaseRepository[models.FuelPriceReference]):
    def __init__(self):
        super().__init__(models.FuelPriceReference)

    def get_price(self, db: Session, city: str, fuel_type: str) -> Optional[models.FuelPriceReference]:
        return (
            db.query(models.FuelPriceReference)
            .filter(models.FuelPriceReference.city == city, models.FuelPriceReference.fuel_type == fuel_type)
            .order_by(models.FuelPriceReference.effective_date.desc())
            .first()
        )


class ActivityLogRepository(BaseRepository[models.ActivityLog]):
    def __init__(self):
        super().__init__(models.ActivityLog)
