import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models, schemas, auth
from app.models import VehicleStatus, TripStatus, DriverStatus

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/kpis", response_model=schemas.DashboardKPIs)
def get_kpis(
    region_filter: Optional[str] = Query(None, alias="region"),
    type_filter: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    q_vehicles = db.query(models.Vehicle).filter(models.Vehicle.status != VehicleStatus.RETIRED)
    if type_filter:
        q_vehicles = q_vehicles.filter(models.Vehicle.type == type_filter)
    if region_filter:
        q_vehicles = q_vehicles.filter(models.Vehicle.region == region_filter)
        
    total_vehicles = q_vehicles.count()
    available = q_vehicles.filter(models.Vehicle.status == VehicleStatus.AVAILABLE).count()
    in_maintenance = q_vehicles.filter(models.Vehicle.status == VehicleStatus.IN_SHOP).count()
    on_trip = q_vehicles.filter(models.Vehicle.status == VehicleStatus.ON_TRIP).count()

    q_trips = db.query(models.Trip).join(models.Vehicle)
    if type_filter:
        q_trips = q_trips.filter(models.Vehicle.type == type_filter)
    if region_filter:
        q_trips = q_trips.filter(models.Vehicle.region == region_filter)

    active_trips = q_trips.filter(models.Trip.status == TripStatus.DISPATCHED).count()
    pending_trips = q_trips.filter(models.Trip.status == TripStatus.DRAFT).count()
    
    # Active drivers
    drivers_on_duty = q_trips.filter(models.Trip.status == TripStatus.DISPATCHED).distinct(models.Trip.driver_id).count()

    utilization = (on_trip / total_vehicles * 100) if total_vehicles else 0.0

    return schemas.DashboardKPIs(
        active_vehicles=total_vehicles,
        available_vehicles=available,
        vehicles_in_maintenance=in_maintenance,
        active_trips=active_trips,
        pending_trips=pending_trips,
        drivers_on_duty=drivers_on_duty,
        fleet_utilization_pct=round(utilization, 2),
    )


@router.get("/dashboard/regions", response_model=List[str])
def get_regions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Returns distinct states and districts present in locations reference data."""
    states = db.query(models.Location.state_name).distinct().all()
    districts = db.query(models.Location.district).distinct().all()
    regions = sorted(list(set([r[0] for r in states if r[0]] + [r[0] for r in districts if r[0]])))
    return regions


@router.get("/reports/vehicle-summary")
def vehicle_summary(
    region_filter: Optional[str] = Query(None, alias="region"),
    type_filter: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Per-vehicle: fuel efficiency, operational cost, and ROI."""
    q = db.query(models.Vehicle)
    if type_filter:
        q = q.filter(models.Vehicle.type == type_filter)
    if region_filter:
        q = q.filter(models.Vehicle.region == region_filter)
        
    vehicles = q.all()
    results = []
    for v in vehicles:
        fuel_cost = db.query(func.coalesce(func.sum(models.FuelLog.cost), 0.0)).filter(
            models.FuelLog.vehicle_id == v.id
        ).scalar()
        fuel_liters = db.query(func.coalesce(func.sum(models.FuelLog.liters), 0.0)).filter(
            models.FuelLog.vehicle_id == v.id
        ).scalar()
        maintenance_cost = db.query(func.coalesce(func.sum(models.MaintenanceLog.cost), 0.0)).filter(
            models.MaintenanceLog.vehicle_id == v.id
        ).scalar()
        distance = db.query(func.coalesce(func.sum(models.Trip.actual_distance), 0.0)).filter(
            models.Trip.vehicle_id == v.id, models.Trip.status == TripStatus.COMPLETED
        ).scalar()
        
        # Sourced from actual completed trips distance * rate or similar, fallback to $2 per km
        revenue = distance * 45.0  # Estimated rate INR 45 per km

        fuel_efficiency = (distance / fuel_liters) if fuel_liters else 0.0
        operational_cost = fuel_cost + maintenance_cost
        roi = ((revenue - operational_cost) / v.acquisition_cost) if v.acquisition_cost else 0.0

        results.append({
            "vehicle_id": v.id,
            "registration_number": v.registration_number,
            "name_model": v.name_model,
            "type": v.type,
            "fuel_efficiency_km_per_l": round(fuel_efficiency, 2),
            "operational_cost": round(operational_cost, 2),
            "distance_travelled_km": round(distance, 2),
            "roi": round(roi, 4),
        })
    return results


@router.get("/reports/export.csv")
def export_csv(
    region_filter: Optional[str] = Query(None, alias="region"),
    type_filter: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    data = vehicle_summary(region_filter=region_filter, type_filter=type_filter, db=db, current_user=current_user)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=[
        "vehicle_id", "registration_number", "name_model", "type", "fuel_efficiency_km_per_l",
        "operational_cost", "distance_travelled_km", "roi",
    ])
    writer.writeheader()
    writer.writerows(data)
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transitops_report.csv"},
    )

