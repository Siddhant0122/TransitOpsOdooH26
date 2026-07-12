from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.activity_logger import log_activity, serialize_model

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = db.query(models.Role).filter(models.Role.name == payload.role).first()
    if not role:
        role = models.Role(name=payload.role)
        db.add(role)
        db.flush()

    user = models.User(
        email=payload.email,
        password_hash=auth.hash_password(payload.password),
        full_name=payload.full_name,
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=user,
        action="USER_REGISTERED",
        entity_type="user",
        entity_id=user.id,
        after_state=serialize_model(user),
        ip_address=ip
    )
    
    return schemas.UserOut(
        id=user.id, email=user.email, full_name=user.full_name,
        role=role.name, is_active=user.is_active,
    )


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = auth.create_access_token(data={"sub": user.id, "role": user.role.name.value})
    
    ip = request.client.host if request.client else None
    log_activity(
        db=db,
        user=user,
        action="USER_LOGGED_IN",
        entity_type="user",
        entity_id=user.id,
        ip_address=ip
    )
    
    return schemas.Token(access_token=token)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return schemas.UserOut(
        id=current_user.id, email=current_user.email, full_name=current_user.full_name,
        role=current_user.role.name, is_active=current_user.is_active,
    )

