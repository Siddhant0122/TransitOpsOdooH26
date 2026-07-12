import csv
import os
import sys

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app import models

def run_seed():
    db = SessionLocal()
    csv_paths = [
        "seed_data/vehicle_catalog.csv",
        "../seed_data/vehicle_catalog.csv",
        "../../seed_data/vehicle_catalog.csv"
    ]
    
    csv_file = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_file = p
            break
            
    if not csv_file:
        print("[WARNING] vehicle_catalog.csv reference file not found under seed_data/. Skipping vehicle make catalog seeding.")
        db.close()
        return

    print(f"Seeding vehicle catalog from {csv_file}...")
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                brand = row["brand"].strip()
                model_name = row["model"].strip()
                db_model = db.query(models.VehicleMakeCatalog).filter(
                    models.VehicleMakeCatalog.brand == brand,
                    models.VehicleMakeCatalog.model == model_name
                ).first()
                if not db_model:
                    db_model = models.VehicleMakeCatalog(
                        vehicle_type=row["vehicle_type"].strip(),
                        brand=brand,
                        model=model_name,
                        typical_max_load_capacity_kg=float(row["typical_max_load_capacity_kg"]),
                        fuel_type=row["fuel_type"].strip(),
                        min_license_category=row["min_license_category"].strip()
                    )
                    db.add(db_model)
                    count += 1
            db.commit()
            print(f"Successfully seeded {count} vehicle models.")
    except Exception as e:
        print(f"[ERROR] Failed to seed vehicle make catalog: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
