import pytest
from datetime import date, timedelta
from app import models, auth

def seed_test_reference_data(db):
    # Seed location
    loc1 = models.Location(pincode="400001", district="Mumbai", state_name="Maharashtra", latitude=18.9218, longitude=72.8347)
    loc2 = models.Location(pincode="110001", district="New Delhi", state_name="Delhi", latitude=28.6304, longitude=77.2177)
    db.add(loc1)
    db.add(loc2)
    
    # Seed vehicle catalog
    v1 = models.VehicleMakeCatalog(
        vehicle_type="pickup", brand="Mahindra", model="Bolero",
        typical_max_load_capacity_kg=1200, fuel_type="Diesel", min_license_category="LMV-TR"
    )
    v2 = models.VehicleMakeCatalog(
        vehicle_type="heavy truck", brand="BharatBenz", model="2823R",
        typical_max_load_capacity_kg=20000, fuel_type="Diesel", min_license_category="HGMV"
    )
    db.add(v1)
    db.add(v2)
    
    # Seed license categories
    l1 = models.DriverLicenseCategory(category_code="LMV-TR", description="Light Transport", applicable_vehicle_types="pickup", min_age=18, min_prior_experience=0)
    l2 = models.DriverLicenseCategory(category_code="HGMV", description="Heavy Goods", applicable_vehicle_types="heavy truck", min_age=22, min_prior_experience=2)
    db.add(l1)
    db.add(l2)
    
    # Seed roles
    role_m = models.Role(name=models.RoleName.FLEET_MANAGER)
    role_d = models.Role(name=models.RoleName.DRIVER_ROLE)
    db.add(role_m)
    db.add(role_d)
    
    db.commit()


def test_trip_business_rules(client, db):
    seed_test_reference_data(db)
    
    # Add active manager user
    role = db.query(models.Role).filter(models.Role.name == models.RoleName.FLEET_MANAGER).first()
    manager = models.User(
        email="manager@transitops.dev",
        password_hash=auth.hash_password("Password123!"),
        full_name="Manager Fay",
        role_id=role.id,
        is_active=True
    )
    db.add(manager)
    db.commit()

    token = auth.create_access_token(data={"sub": manager.id, "role": role.name.value})
    headers = {"Authorization": f"Bearer {token}"}

    # Add vehicles
    pickup = models.Vehicle(
        registration_number="MH-01-AA-1111", name_model="Mahindra Bolero",
        type="pickup", max_load_capacity=1200, odometer=1000, acquisition_cost=800000,
        status=models.VehicleStatus.AVAILABLE, region="Maharashtra"
    )
    heavy = models.Vehicle(
        registration_number="MH-01-BB-2222", name_model="BharatBenz 2823R",
        type="heavy truck", max_load_capacity=20000, odometer=5000, acquisition_cost=2500000,
        status=models.VehicleStatus.AVAILABLE, region="Maharashtra"
    )
    db.add(pickup)
    db.add(heavy)

    # Add drivers
    driver_light = models.Driver(
        name="Light Driver", license_number="LIC-LIGHT", license_category="LMV-TR",
        license_expiry=date.today() + timedelta(days=100), contact_number="1234567890",
        status=models.DriverStatus.AVAILABLE
    )
    driver_heavy = models.Driver(
        name="Heavy Driver", license_number="LIC-HEAVY", license_category="HGMV",
        license_expiry=date.today() + timedelta(days=200), contact_number="0987654321",
        status=models.DriverStatus.AVAILABLE
    )
    db.add(driver_light)
    db.add(driver_heavy)
    db.commit()

    # 1. Test cargo weight capacity check
    response = client.post("/trips/", json={
        "source": "400001",
        "destination": "110001",
        "vehicle_id": pickup.id,
        "driver_id": driver_light.id,
        "cargo_weight": 1500, # exceeds 1200 limit
        "planned_distance": 1400
    }, headers=headers)
    assert response.status_code == 400
    assert "exceeds vehicle capacity" in response.json()["detail"]

    # 2. Test license compatibility checks (LMV-TR driver cannot drive heavy truck which needs HGMV)
    response = client.post("/trips/", json={
        "source": "400001",
        "destination": "110001",
        "vehicle_id": heavy.id,
        "driver_id": driver_light.id,
        "cargo_weight": 5000,
        "planned_distance": 1400
    }, headers=headers)
    assert response.status_code == 400
    assert "incompatible" in response.json()["detail"]

    # 3. Create a valid trip (HGMV driver driving heavy truck)
    response = client.post("/trips/", json={
        "source": "400001",
        "destination": "110001",
        "vehicle_id": heavy.id,
        "driver_id": driver_heavy.id,
        "cargo_weight": 10000,
        "planned_distance": 1400
    }, headers=headers)
    assert response.status_code == 201
    trip_id = response.json()["id"]

    # 4. Dispatch the trip
    response = client.post(f"/trips/{trip_id}/dispatch", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Dispatched"

    # Reload statuses and assert they are On Trip
    db.refresh(heavy)
    db.refresh(driver_heavy)
    assert heavy.status == models.VehicleStatus.ON_TRIP
    assert driver_heavy.status == models.DriverStatus.ON_TRIP

    # 5. Complete the trip
    response = client.post(f"/trips/{trip_id}/complete", json={
        "final_odometer": 6400, # 5000 + 1400
        "fuel_consumed": 150
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Completed"

    # Verify assets restored
    db.refresh(heavy)
    db.refresh(driver_heavy)
    assert heavy.status == models.VehicleStatus.AVAILABLE
    assert heavy.odometer == 6400
    assert driver_heavy.status == models.DriverStatus.AVAILABLE
