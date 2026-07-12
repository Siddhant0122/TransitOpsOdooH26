from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.models import RoleName, VehicleStatus, MaintenanceStatus
from app.services.services import MaintenanceService
from app.activity_logger import log_activity, serialize_model

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

WRITE_ROLES = (RoleName.FLEET_MANAGER,)

maintenance_service = MaintenanceService()


@router.get("/", response_model=List[schemas.MaintenanceOut])
def list_maintenance(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return maintenance_service.list_logs(db)


@router.post("/", response_model=schemas.MaintenanceOut, status_code=201,
             dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def create_maintenance(
    payload: schemas.MaintenanceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    log = maintenance_service.create_log(db, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="MAINTENANCE_CREATED",
        entity_type="maintenance",
        entity_id=log.id,
        after_state=serialize_model(log),
        ip_address=ip
    )
    
    return log


@router.post("/{log_id}/close", response_model=schemas.MaintenanceOut,
             dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def close_maintenance(
    log_id: str,
    request: Request,
    solution: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_obj = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    before_state = serialize_model(db_obj)

    log = maintenance_service.close_log(db, log_id, solution)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="MAINTENANCE_CLOSED",
        entity_type="maintenance",
        entity_id=log.id,
        before_state=before_state,
        after_state=serialize_model(log),
        ip_address=ip
    )
    
    return log

