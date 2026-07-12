import csv
import os
import sys

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app import models

BATCH_SIZE = 500

def run_seed():
    db = SessionLocal()
    csv_paths = [
        "seed_data/locations_seed.csv",
        "../seed_data/locations_seed.csv",
        "../../seed_data/locations_seed.csv",
        # Fallback to old name
        "seed_data/locations.csv",
        "../seed_data/locations.csv",
        "../../seed_data/locations.csv",
    ]

    csv_file = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_file = p
            break

    if not csv_file:
        print("[WARNING] locations CSV not found under seed_data/. Skipping locations seeding.")
        db.close()
        return

    print(f"Seeding locations from {csv_file}...")
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            batch = 0
            for row in reader:
                pincode = row["pincode"].strip()
                if not pincode:
                    continue
                db_loc = db.query(models.Location).filter(
                    models.Location.pincode == pincode
                ).first()
                if not db_loc:
                    db.add(models.Location(
                        pincode=pincode,
                        district=row["district"].strip(),
                        state_name=row["state_name"].strip(),
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"])
                    ))
                    count += 1
                    batch += 1
                    if batch >= BATCH_SIZE:
                        db.commit()
                        batch = 0
                        print(f"  ...committed {count} locations so far")
            db.commit()
            print(f"Successfully seeded {count} locations.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed locations: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
