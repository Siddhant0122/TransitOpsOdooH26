from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/catalogs", tags=["catalogs"])

@router.get("/locations", response_model=List[schemas.LocationOut])
def get_locations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Location).all()


@router.get("/vehicle-types", response_model=List[schemas.VehicleMakeCatalogOut])
def get_vehicle_types(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.VehicleMakeCatalog).all()


@router.get("/maintenance-issues", response_model=List[schemas.MaintenanceIssueCatalogOut])
def get_maintenance_issues(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.MaintenanceIssueCatalog).all()


@router.get("/maintenance-solutions", response_model=List[schemas.MaintenanceSolutionCatalogOut])
def get_maintenance_solutions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.MaintenanceSolutionCatalog).all()


@router.get("/license-categories", response_model=List[schemas.DriverLicenseCategoryOut])
def get_license_categories(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.DriverLicenseCategory).all()


@router.get("/fuel-prices", response_model=List[schemas.FuelPriceReferenceOut])
def get_fuel_prices(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.FuelPriceReference).all()
