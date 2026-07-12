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
        "seed_data/license_categories.csv",
        "../seed_data/license_categories.csv",
        "../../seed_data/license_categories.csv"
    ]
    
    csv_file = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_file = p
            break
            
    if not csv_file:
        print("[WARNING] license_categories.csv reference file not found under seed_data/. Skipping driver license categories seeding.")
        db.close()
        return

    print(f"Seeding driver license categories from {csv_file}...")
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                code = row["category_code"].strip()
                db_cat = db.query(models.DriverLicenseCategory).filter(
                    models.DriverLicenseCategory.category_code == code
                ).first()
                if not db_cat:
                    db_cat = models.DriverLicenseCategory(
                        category_code=code,
                        description=row["description"].strip(),
                        applicable_vehicle_types=row["applicable_vehicle_types"].strip(),
                        min_age=int(row["min_age"]),
                        min_prior_experience=int(row["min_prior_experience"]),
                        notes=row.get("notes", "").strip() if row.get("notes") else None
                    )
                    db.add(db_cat)
                    count += 1
            db.commit()
            print(f"Successfully seeded {count} driver license categories.")
    except Exception as e:
        print(f"[ERROR] Failed to seed driver license categories: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
