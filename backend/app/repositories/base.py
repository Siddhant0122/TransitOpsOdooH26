from abc import ABC
from typing import TypeVar, Generic, Type, List, Optional
from sqlalchemy.orm import Session
from app.database import Base

T = TypeVar("T", bound=Base)

class BaseRepository(Generic[T], ABC):
    def __init__(self, model: Type[T]):
        self.model = model

    def get(self, db: Session, id: str) -> Optional[T]:
        # Generic get method. Assumes primary key is named 'id' unless overridden.
        return db.query(self.model).filter(self.model.id == id).first()

    def list(self, db: Session) -> List[T]:
        return db.query(self.model).all()

    def create(self, db: Session, obj: T) -> T:
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, db_obj: T, obj_in: dict) -> T:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, db_obj: T) -> None:
        db.delete(db_obj)
        db.commit()
