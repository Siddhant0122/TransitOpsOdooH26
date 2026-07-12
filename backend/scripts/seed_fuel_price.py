import csv
import os
import sys
from datetime import datetime

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app import models

def run_seed():
    db = SessionLocal()
    # New CSV: "fuel_price_reference (1).csv" — columns: state_name, fuel_type, price_per_litre_inr, effective_date
    csv_paths = [
        "seed_data/fuel_price_reference (1).csv",
        "../seed_data/fuel_price_reference (1).csv",
        "../../seed_data/fuel_price_reference (1).csv",
        # Fallback to old name if someone renames it
        "seed_data/fuel_price_reference.csv",
        "../seed_data/fuel_price_reference.csv",
        "../../seed_data/fuel_price_reference.csv",
    ]

    csv_file = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_file = p
            break

    if not csv_file:
        print("[WARNING] fuel_price_reference CSV not found under seed_data/. Skipping fuel price seeding.")
        db.close()
        return

    print(f"Seeding fuel price reference from {csv_file}...")
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                if not row:
                    continue
                # New CSV schema: state_name, fuel_type, price_per_litre_inr, effective_date
                # Old CSV schema: city, state, fuel_type, price_per_litre_inr, effective_date
                headers = reader.fieldnames or []
                if "state_name" in headers:
                    state_val = row["state_name"].strip()
                    city_val = state_val   # use state as city fallback
                else:
                    state_val = row.get("state", "").strip()
                    city_val = row.get("city", "").strip()

                fuel_type = row["fuel_type"].strip()
                eff_date_str = row["effective_date"].strip()
                eff_date = datetime.strptime(eff_date_str, "%Y-%m-%d").date()

                db_price = db.query(models.FuelPriceReference).filter(
                    models.FuelPriceReference.state == state_val,
                    models.FuelPriceReference.fuel_type == fuel_type,
                    models.FuelPriceReference.effective_date == eff_date
                ).first()

                if not db_price:
                    db_price = models.FuelPriceReference(
                        city=city_val,
                        state=state_val,
                        fuel_type=fuel_type,
                        price_per_litre_inr=float(row["price_per_litre_inr"]),
                        effective_date=eff_date
                    )
                    db.add(db_price)
                    count += 1

            db.commit()
            print(f"Successfully seeded {count} fuel price reference snapshot entries.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed fuel price reference: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
