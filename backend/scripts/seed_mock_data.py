import os
import sys
import base64
from datetime import datetime, date, timedelta
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app import models
from app.services.services import compute_haversine_distance

# Helper to encrypt Driver data with fleet manager's key
def encrypt_pii(plaintext: str, passphrase: str, salt: str) -> str:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt.encode("utf-8"),
        iterations=100000
    )
    key = kdf.derive(passphrase.encode("utf-8"))
    
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    
    ciphertext_base64 = base64.b64encode(ciphertext).decode("utf-8")
    iv_base64 = base64.b64encode(iv).decode("utf-8")
    return f"{ciphertext_base64}:{iv_base64}"

def run_seed():
    db = SessionLocal()
    print("Seeding functional mock dataset (vehicles, drivers, trips, logs)...")
    
    # 1. Credentials for encrypting driver info
    manager_email = "fleet.manager@transitops.dev"
    manager_pass = "Password123!"
    
    # Fetch creator manager user
    manager_user = db.query(models.User).filter(models.User.email == manager_email).first()
    if not manager_user:
        print("[ERROR] Fleet manager user not found. Run seed_demo_users first.")
        db.close()
        return

    # Check if mock data is already seeded (idempotency check)
    existing_mock_vehicle = db.query(models.Vehicle).filter(models.Vehicle.registration_number == "MH-12-PQ-1234").first()
    if existing_mock_vehicle:
        print("Mock data already seeded. Skipping.")
        db.close()
        return

    try:
        # 2. Seed Mock Vehicles
        vehicles_data = [
            ("MH-12-PQ-1234", "Tata Ace Gold", "mini truck", 750.0, 12500.0, 550000.0, models.VehicleStatus.AVAILABLE, "West"),
            ("DL-01-AB-5678", "Mahindra Bolero Pik-Up", "pickup", 1500.0, 45000.5, 850000.0, models.VehicleStatus.ON_TRIP, "North"),
            ("KA-03-XY-9012", "Ashok Leyland Dost+", "light truck", 2500.0, 8000.0, 750000.0, models.VehicleStatus.AVAILABLE, "South"),
            ("HR-26-CD-3456", "Tata T.16 Ultra", "medium truck", 10000.0, 62000.0, 1800000.0, models.VehicleStatus.IN_SHOP, "North"),
            ("GJ-01-EF-7890", "BharatBenz 2823R", "heavy truck", 20000.0, 115000.0, 3200000.0, models.VehicleStatus.AVAILABLE, "West"),
        ]
        
        vehicles = []
        for reg, name, v_type, cap, odo, cost, status, region in vehicles_data:
            v = models.Vehicle(
                registration_number=reg,
                name_model=name,
                type=v_type,
                max_load_capacity=cap,
                odometer=odo,
                acquisition_cost=cost,
                status=status,
                region=region
            )
            db.add(v)
            vehicles.append(v)
        db.flush()  # Generate vehicle IDs

        # 3. Seed Mock Drivers (PII encrypted with Manager's Key)
        drivers_data = [
            ("Dan Driver", "DL-1420180098765", "LMV-TR", date.today() + timedelta(days=365), "+919876543210", 95, models.DriverStatus.AVAILABLE),
            ("Alice Smith", "MH-1220150012345", "HMV", date.today() + timedelta(days=730), "+919876543211", 98, models.DriverStatus.ON_TRIP),
            ("Bob Jones", "KA-0320120054321", "HGMV", date.today() + timedelta(days=1000), "+919876543212", 85, models.DriverStatus.AVAILABLE),
            ("Charlie Brown", "DL-0420100011111", "LMV-TR", date.today() - timedelta(days=15), "+919876543213", 90, models.DriverStatus.AVAILABLE),
            ("David Miller", "HR-2620160022222", "HMV", date.today() + timedelta(days=500), "+919876543214", 70, models.DriverStatus.SUSPENDED),
        ]

        drivers = []
        for name, license_num, category, expiry, contact, score, status in drivers_data:
            enc_license = encrypt_pii(license_num, manager_pass, manager_email)
            enc_contact = encrypt_pii(contact, manager_pass, manager_email)
            d = models.Driver(
                name=name,
                license_number=enc_license,
                license_category=category,
                license_expiry=expiry,
                contact_number=enc_contact,
                safety_score=score,
                status=status
            )
            db.add(d)
            drivers.append(d)
        db.flush()  # Generate driver IDs

        # Lookup locations for planned distance calculation
        # Delhi pincodes (110001 to 110005)
        pincodes = ["110001", "110002", "110003", "110004", "110005"]
        locs = {p: db.query(models.Location).filter(models.Location.pincode == p).first() for p in pincodes}
        
        # Helper to compute distance or fallback to a default if pincode not seeded
        def get_dist(p1, p2):
            l1, l2 = locs.get(p1), locs.get(p2)
            if l1 and l2:
                return compute_haversine_distance(l1.latitude, l1.longitude, l2.latitude, l2.longitude)
            return 10.0

        # 4. Seed Mock Trips
        # Find specific drivers and vehicles for matches
        v_ace = [v for v in vehicles if v.registration_number == "MH-12-PQ-1234"][0]
        v_bolero = [v for v in vehicles if v.registration_number == "DL-01-AB-5678"][0]
        v_dost = [v for v in vehicles if v.registration_number == "KA-03-XY-9012"][0]
        
        d_dan = [d for d in drivers if d.name == "Dan Driver"][0]
        d_alice = [d for d in drivers if d.name == "Alice Smith"][0]
        d_bob = [d for d in drivers if d.name == "Bob Jones"][0]

        # Trip 1: Dispatched (Bolero + Alice)
        t1 = models.Trip(
            source="110001",
            destination="110002",
            vehicle_id=v_bolero.id,
            driver_id=d_alice.id,
            created_by=manager_user.id,
            cargo_weight=1200.0,
            planned_distance=get_dist("110001", "110002"),
            status=models.TripStatus.DISPATCHED,
            dispatched_at=datetime.utcnow() - timedelta(hours=3),
        )
        db.add(t1)

        # Trip 2: Completed (Ace + Dan)
        t2 = models.Trip(
            source="110001",
            destination="110003",
            vehicle_id=v_ace.id,
            driver_id=d_dan.id,
            created_by=manager_user.id,
            cargo_weight=500.0,
            planned_distance=get_dist("110001", "110003"),
            actual_distance=get_dist("110001", "110003") + 0.5,
            fuel_consumed=1.8,
            status=models.TripStatus.COMPLETED,
            dispatched_at=datetime.utcnow() - timedelta(days=1, hours=4),
            completed_at=datetime.utcnow() - timedelta(days=1),
        )
        db.add(t2)

        # Trip 3: Draft (Dost+ + Bob)
        t3 = models.Trip(
            source="110003",
            destination="110005",
            vehicle_id=v_dost.id,
            driver_id=d_bob.id,
            created_by=manager_user.id,
            cargo_weight=1800.0,
            planned_distance=get_dist("110003", "110005"),
            status=models.TripStatus.DRAFT,
        )
        db.add(t3)

        # Trip 4: Cancelled (Ace + Dan)
        t4 = models.Trip(
            source="110002",
            destination="110004",
            vehicle_id=v_ace.id,
            driver_id=d_dan.id,
            created_by=manager_user.id,
            cargo_weight=400.0,
            planned_distance=get_dist("110002", "110004"),
            status=models.TripStatus.CANCELLED,
        )
        db.add(t4)
        db.flush()

        # 5. Seed Fuel Logs
        # Log 1: Linked to completed Trip 2 (Ace)
        f1 = models.FuelLog(
            vehicle_id=v_ace.id,
            trip_id=t2.id,
            liters=1.8,
            cost=176.4, # ~98 INR/liter
            log_date=date.today() - timedelta(days=1)
        )
        db.add(f1)
        
        # Log 2: General fuel up (Ace)
        f2 = models.FuelLog(
            vehicle_id=v_ace.id,
            liters=12.0,
            cost=1176.0,
            log_date=date.today() - timedelta(days=5)
        )
        db.add(f2)

        # Log 3: General fuel up (Dost+)
        f3 = models.FuelLog(
            vehicle_id=v_dost.id,
            liters=25.0,
            cost=2450.0,
            log_date=date.today() - timedelta(days=3)
        )
        db.add(f3)

        # 6. Seed Maintenance Logs
        # Log 1: Open maintenance (Ultra truck)
        m1 = models.MaintenanceLog(
            vehicle_id=vehicles[3].id, # HR-26-CD-3456
            maintenance_type="Engine Tune-up",
            description="Replacing faulty spark plugs, engine oil flush, and fuel filter update.",
            start_date=date.today() - timedelta(days=2),
            status=models.MaintenanceStatus.OPEN
        )
        db.add(m1)

        # Log 2: Closed maintenance (Ace)
        m2 = models.MaintenanceLog(
            vehicle_id=v_ace.id,
            maintenance_type="Routine Brake Service",
            description="Brake pads replaced, brake line bleeding, and caliper lubrication.",
            start_date=date.today() - timedelta(days=15),
            end_date=date.today() - timedelta(days=14),
            cost=4200.0,
            status=models.MaintenanceStatus.CLOSED
        )
        db.add(m2)

        # 7. Seed Expenses
        # Expense 1: Toll expense linked to completed Trip 2 (Ace)
        e1 = models.Expense(
            vehicle_id=v_ace.id,
            trip_id=t2.id,
            category=models.ExpenseCategory.TOLL,
            amount=150.0,
            expense_date=date.today() - timedelta(days=1),
            notes="Delhi-Jaipur highway toll plaza"
        )
        db.add(e1)

        # Expense 2: Other general operational expense (Dost+)
        e2 = models.Expense(
            vehicle_id=v_dost.id,
            category=models.ExpenseCategory.OTHER,
            amount=350.0,
            expense_date=date.today() - timedelta(days=3),
            notes="Driver overnight parking fees"
        )
        db.add(e2)

        # 8. Seed Activity Logs
        # Log 1: Vehicle created
        act1 = models.ActivityLog(
            user_id=manager_user.id,
            user_role=models.RoleName.FLEET_MANAGER.value,
            action="VEHICLE_CREATED",
            entity_type="vehicle",
            entity_id=v_ace.id,
            after_state={"registration_number": v_ace.registration_number, "name_model": v_ace.name_model},
            ip_address="127.0.0.1",
            timestamp=datetime.utcnow() - timedelta(days=10)
        )
        db.add(act1)

        # Log 2: Driver created
        act2 = models.ActivityLog(
            user_id=manager_user.id,
            user_role=models.RoleName.FLEET_MANAGER.value,
            action="DRIVER_CREATED",
            entity_type="driver",
            entity_id=d_dan.id,
            after_state={"name": d_dan.name, "license_category": d_dan.license_category},
            ip_address="127.0.0.1",
            timestamp=datetime.utcnow() - timedelta(days=8)
        )
        db.add(act2)

        # Log 3: Trip completed
        act3 = models.ActivityLog(
            user_id=manager_user.id,
            user_role=models.RoleName.FLEET_MANAGER.value,
            action="TRIP_COMPLETED",
            entity_type="trip",
            entity_id=t2.id,
            after_state={"id": t2.id, "status": "Completed", "fuel_consumed": t2.fuel_consumed},
            ip_address="127.0.0.1",
            timestamp=datetime.utcnow() - timedelta(days=1)
        )
        db.add(act3)

        db.commit()
        print("Successfully seeded all functional mock data!")
        
    except Exception as ex:
        db.rollback()
        print(f"[ERROR] Failed to seed mock data: {ex}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
