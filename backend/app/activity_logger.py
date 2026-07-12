from datetime import datetime, date
import enum
from typing import Optional, Any
from sqlalchemy.orm import Session
from app import models

def serialize_model(obj: Any) -> Optional[dict]:
    if obj is None:
        return None
    try:
        result = {}
        for column in obj.__table__.columns:
            val = getattr(obj, column.name)
            if isinstance(val, (datetime, date)):
                val = val.isoformat()
            elif isinstance(val, enum.Enum):
                val = val.value
            result[column.name] = val
        return result
    except Exception:
        return None


def log_activity(
    db: Session,
    user: Optional[models.User],
    action: str,
    entity_type: str,
    entity_id: Optional[str],
    before_state: Optional[dict] = None,
    after_state: Optional[dict] = None,
    ip_address: Optional[str] = None
) -> models.ActivityLog:
    """
    Appends an audit log record into the activity_logs table.
    """
    role_val = None
    if user and user.role:
        role_val = user.role.name.value if hasattr(user.role.name, "value") else str(user.role.name)

    log_entry = models.ActivityLog(
        user_id=user.id if user else None,
        user_role=role_val,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    return log_entry
