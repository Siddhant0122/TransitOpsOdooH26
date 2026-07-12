from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.models import RoleName, VehicleStatus
from app.services.services import VehicleService
from app.activity_logger import log_activity, serialize_model

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

# Fleet Manager owns the registry. Others can read.
WRITE_ROLES = (RoleName.FLEET_MANAGER,)

vehicle_service = VehicleService()


@router.get("/", response_model=List[schemas.VehicleOut])
def list_vehicles(
    status_filter: Optional[VehicleStatus] = None,
    type_filter: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return vehicle_service.list_vehicles(db, status_filter, type_filter, region)


@router.get("/dispatch-pool", response_model=List[schemas.VehicleOut])
def dispatch_pool(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Vehicles eligible for a new trip: never Retired or In Shop, never already On Trip."""
    return db.query(models.Vehicle).filter(models.Vehicle.status == VehicleStatus.AVAILABLE).all()


@router.post("/", response_model=schemas.VehicleOut, status_code=201,
             dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def create_vehicle(
    payload: schemas.VehicleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    vehicle = vehicle_service.create_vehicle(db, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="VEHICLE_CREATED",
        entity_type="vehicle",
        entity_id=vehicle.id,
        after_state=serialize_model(vehicle),
        ip_address=ip
    )
    
    return vehicle


@router.put("/{vehicle_id}", response_model=schemas.VehicleOut,
            dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def update_vehicle(
    vehicle_id: str,
    payload: schemas.VehicleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_obj = vehicle_service.get_vehicle(db, vehicle_id)
    before_state = serialize_model(db_obj)
    
    vehicle = vehicle_service.update_vehicle(db, vehicle_id, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="VEHICLE_UPDATED",
        entity_type="vehicle",
        entity_id=vehicle.id,
        before_state=before_state,
        after_state=serialize_model(vehicle),
        ip_address=ip
    )
    
    return vehicle


@router.delete("/{vehicle_id}", status_code=204,
               dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def retire_vehicle(
    vehicle_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Soft-delete: retire rather than hard-delete, to preserve trip/expense history."""
    db_obj = vehicle_service.get_vehicle(db, vehicle_id)
    before_state = serialize_model(db_obj)
    
    vehicle_service.retire_vehicle(db, vehicle_id)
    
    # Reload to log the updated state (status = Retired)
    db.refresh(db_obj)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="VEHICLE_RETIRED",
        entity_type="vehicle",
        entity_id=vehicle_id,
        before_state=before_state,
        after_state=serialize_model(db_obj),
        ip_address=ip
    )

