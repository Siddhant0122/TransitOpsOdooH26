import csv
import io
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.models import RoleName

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])

# Restrict to Fleet Manager and Safety Officer
ALLOWED_ROLES = (RoleName.FLEET_MANAGER, RoleName.SAFETY_OFFICER)

@router.get("/", dependencies=[Depends(auth.RequireRole(*ALLOWED_ROLES))])
def list_activity_logs(
    user_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None), # ISO format: YYYY-MM-DD
    end_date: Optional[str] = Query(None),   # ISO format: YYYY-MM-DD
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.ActivityLog)

    if user_id:
        query = query.filter(models.ActivityLog.user_id == user_id)
    if entity_type:
        query = query.filter(models.ActivityLog.entity_type == entity_type)
    if action:
        query = query.filter(models.ActivityLog.action == action)
    if start_date:
        try:
            dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.ActivityLog.timestamp >= dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format, use YYYY-MM-DD")
    if end_date:
        try:
            # End of day check
            dt = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
            query = query.filter(models.ActivityLog.timestamp <= dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format, use YYYY-MM-DD")

    total = query.count()
    logs = query.order_by(models.ActivityLog.timestamp.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": [schemas.ActivityLogOut.model_validate(log) for log in logs]
    }


@router.get("/export", dependencies=[Depends(auth.RequireRole(*ALLOWED_ROLES))])
def export_activity_logs(
    user_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.ActivityLog)

    if user_id:
        query = query.filter(models.ActivityLog.user_id == user_id)
    if entity_type:
        query = query.filter(models.ActivityLog.entity_type == entity_type)
    if action:
        query = query.filter(models.ActivityLog.action == action)
    if start_date:
        try:
            dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.ActivityLog.timestamp >= dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format, use YYYY-MM-DD")
    if end_date:
        try:
            dt = datetime.strptime(f"{end_date} 23:59:59", "%Y-%m-%d %H:%M:%S")
            query = query.filter(models.ActivityLog.timestamp <= dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format, use YYYY-MM-DD")

    logs = query.order_by(models.ActivityLog.timestamp.desc()).all()

    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=[
        "id", "user_id", "user_role", "action", "entity_type", "entity_id",
        "before_state", "after_state", "ip_address", "timestamp"
    ])
    writer.writeheader()
    for log in logs:
        writer.writerow({
            "id": log.id,
            "user_id": log.user_id,
            "user_role": log.user_role,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "before_state": str(log.before_state),
            "after_state": str(log.after_state),
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat()
        })
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=activity_logs.csv"},
    )
