from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.models import RoleName, DriverStatus
from app.services.services import DriverService
from app.activity_logger import log_activity, serialize_model

router = APIRouter(prefix="/drivers", tags=["drivers"])

# Fleet Manager + Safety Officer can manage drivers (safety officer owns compliance fields)
WRITE_ROLES = (RoleName.FLEET_MANAGER, RoleName.SAFETY_OFFICER)

driver_service = DriverService()


@router.get("/", response_model=List[schemas.DriverOut])
def list_drivers(
    status_filter: Optional[DriverStatus] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return driver_service.list_drivers(db, status_filter)


@router.get("/dispatch-pool", response_model=List[schemas.DriverOut])
def dispatch_pool(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Drivers eligible for a new trip: Available, not suspended, license not expired."""
    return (
        db.query(models.Driver)
        .filter(models.Driver.status == DriverStatus.AVAILABLE)
        .filter(models.Driver.license_expiry >= date.today())
        .all()
    )


@router.get("/expiring-licenses", response_model=List[schemas.DriverOut])
def expiring_licenses(
    within_days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RequireRole(RoleName.SAFETY_OFFICER, RoleName.FLEET_MANAGER)),
):
    from datetime import timedelta
    cutoff = date.today() + timedelta(days=within_days)
    return db.query(models.Driver).filter(models.Driver.license_expiry <= cutoff).all()


@router.post("/", response_model=schemas.DriverOut, status_code=201,
             dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def create_driver(
    payload: schemas.DriverCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    driver = driver_service.create_driver(db, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="DRIVER_CREATED",
        entity_type="driver",
        entity_id=driver.id,
        after_state=serialize_model(driver),
        ip_address=ip
    )
    
    return driver


@router.put("/{driver_id}", response_model=schemas.DriverOut,
            dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def update_driver(
    driver_id: str,
    payload: schemas.DriverUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_obj = driver_service.get_driver(db, driver_id)
    before_state = serialize_model(db_obj)
    
    driver = driver_service.update_driver(db, driver_id, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="DRIVER_UPDATED",
        entity_type="driver",
        entity_id=driver.id,
        before_state=before_state,
        after_state=serialize_model(driver),
        ip_address=ip
    )
    
    return driver


@router.delete("/{driver_id}", status_code=204,
               dependencies=[Depends(auth.RequireRole(RoleName.SAFETY_OFFICER))])
def suspend_driver(
    driver_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_obj = driver_service.get_driver(db, driver_id)
    before_state = serialize_model(db_obj)
    
    driver_service.suspend_driver(db, driver_id)
    
    # Reload to log the updated state (status = Suspended)
    db.refresh(db_obj)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="DRIVER_SUSPENDED",
        entity_type="driver",
        entity_id=driver_id,
        before_state=before_state,
        after_state=serialize_model(db_obj),
        ip_address=ip
    )

