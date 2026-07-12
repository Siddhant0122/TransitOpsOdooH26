from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models  # noqa: F401 -- ensures models are registered before create_all
from app.routers import (
    auth_router, vehicles, drivers, trips,
    maintenance, fuel_expense, dashboard,
    activity_logs, catalogs
)

# For dev speed/sqlite setup, this creates tables, but we'll also write migration files.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TransitOps API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open origins for dev; docker-compose links will connect safely.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(vehicles.router)
app.include_router(drivers.router)
app.include_router(trips.router)
app.include_router(maintenance.router)
app.include_router(fuel_expense.router)
app.include_router(dashboard.router)
app.include_router(activity_logs.router)
app.include_router(catalogs.router)


@app.get("/")
def root():
    return {"status": "TransitOps API running"}

