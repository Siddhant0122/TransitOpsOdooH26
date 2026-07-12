from datetime import date, datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.models import RoleName, VehicleStatus, DriverStatus, TripStatus
from app.services.services import TripService
from app.activity_logger import log_activity, serialize_model

router = APIRouter(prefix="/trips", tags=["trips"])

# Any authenticated operational role can create/dispatch trips; tune as needed.
DISPATCH_ROLES = (RoleName.FLEET_MANAGER, RoleName.DRIVER_ROLE)

trip_service = TripService()


@router.get("/", response_model=List[schemas.TripOut])
def list_trips(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return trip_service.list_trips(db)


@router.get("/calculate-distance", response_model=float)
def calculate_distance(
    source: str,
    destination: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Calculates haversine distance between two pincodes."""
    return trip_service.calculate_distance(db, source, destination)


@router.post("/", response_model=schemas.TripOut, status_code=201,
              dependencies=[Depends(auth.RequireRole(*DISPATCH_ROLES))])
def create_trip(
    payload: schemas.TripCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Creates a trip in Draft status. All eligibility rules are enforced here
    so an invalid trip can never be created, not just blocked at dispatch time."""
    trip = trip_service.create_trip(db, payload, current_user.id)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="TRIP_CREATED",
        entity_type="trip",
        entity_id=trip.id,
        after_state=serialize_model(trip),
        ip_address=ip
    )
    
    return trip


@router.post("/{trip_id}/dispatch", response_model=schemas.TripOut,
              dependencies=[Depends(auth.RequireRole(*DISPATCH_ROLES))])
def dispatch_trip(
    trip_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_obj = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Trip not found")
    before_state = serialize_model(db_obj)

    trip = trip_service.dispatch_trip(db, trip_id)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="TRIP_DISPATCHED",
        entity_type="trip",
        entity_id=trip.id,
        before_state=before_state,
        after_state=serialize_model(trip),
        ip_address=ip
    )
    
    return trip


@router.post("/{trip_id}/complete", response_model=schemas.TripOut,
              dependencies=[Depends(auth.RequireRole(*DISPATCH_ROLES))])
def complete_trip(
    trip_id: str,
    payload: schemas.TripCompleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_obj = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Trip not found")
    before_state = serialize_model(db_obj)

    trip = trip_service.complete_trip(db, trip_id, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="TRIP_COMPLETED",
        entity_type="trip",
        entity_id=trip.id,
        before_state=before_state,
        after_state=serialize_model(trip),
        ip_address=ip
    )
    
    return trip


@router.post("/{trip_id}/cancel", response_model=schemas.TripOut,
              dependencies=[Depends(auth.RequireRole(*DISPATCH_ROLES))])
def cancel_trip(
    trip_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_obj = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Trip not found")
    before_state = serialize_model(db_obj)

    trip = trip_service.cancel_trip(db, trip_id)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="TRIP_CANCELLED",
        entity_type="trip",
        entity_id=trip.id,
        before_state=before_state,
        after_state=serialize_model(trip),
        ip_address=ip
    )
    
    return trip

