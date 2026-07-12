from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas, auth
from app.models import RoleName
from app.services.services import FuelExpenseService
from app.activity_logger import log_activity, serialize_model

router = APIRouter(tags=["fuel-expense"])

WRITE_ROLES = (RoleName.FLEET_MANAGER, RoleName.DRIVER_ROLE)

fuel_expense_service = FuelExpenseService()


@router.post("/fuel-logs", response_model=schemas.FuelLogOut, status_code=201,
             dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def create_fuel_log(
    payload: schemas.FuelLogCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    log = fuel_expense_service.create_fuel_log(db, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="FUEL_LOG_CREATED",
        entity_type="fuel_log",
        entity_id=log.id,
        after_state=serialize_model(log),
        ip_address=ip
    )
    
    return log


@router.get("/fuel-logs", response_model=List[schemas.FuelLogOut])
def list_fuel_logs(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.FuelLog).all()


@router.post("/expenses", response_model=schemas.ExpenseOut, status_code=201,
             dependencies=[Depends(auth.RequireRole(*WRITE_ROLES))])
def create_expense(
    payload: schemas.ExpenseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    expense = fuel_expense_service.create_expense(db, payload)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=current_user,
        action="EXPENSE_CREATED",
        entity_type="expense",
        entity_id=expense.id,
        after_state=serialize_model(expense),
        ip_address=ip
    )
    
    return expense


@router.get("/expenses", response_model=List[schemas.ExpenseOut])
def list_expenses(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Expense).all()


@router.get("/vehicles/{vehicle_id}/operational-cost",
             dependencies=[Depends(auth.RequireRole(RoleName.FINANCIAL_ANALYST, RoleName.FLEET_MANAGER))])
def operational_cost(vehicle_id: str, db: Session = Depends(get_db)):
    """Total operational cost = Fuel + Maintenance (+ misc expenses) for a vehicle."""
    if not db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first():
        raise HTTPException(status_code=404, detail="Vehicle not found")

    fuel_total = db.query(func.coalesce(func.sum(models.FuelLog.cost), 0.0)).filter(
        models.FuelLog.vehicle_id == vehicle_id
    ).scalar()
    maintenance_total = db.query(func.coalesce(func.sum(models.MaintenanceLog.cost), 0.0)).filter(
        models.MaintenanceLog.vehicle_id == vehicle_id
    ).scalar()
    expense_total = db.query(func.coalesce(func.sum(models.Expense.amount), 0.0)).filter(
        models.Expense.vehicle_id == vehicle_id
    ).scalar()

    return {
        "vehicle_id": vehicle_id,
        "fuel_cost": fuel_total,
        "maintenance_cost": maintenance_total,
        "other_expenses": expense_total,
        "total_operational_cost": fuel_total + maintenance_total + expense_total,
    }

