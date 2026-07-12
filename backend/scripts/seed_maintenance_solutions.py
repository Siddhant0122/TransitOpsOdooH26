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
        "seed_data/maintenance_solutions_seed.csv",
        "../seed_data/maintenance_solutions_seed.csv",
        "../../seed_data/maintenance_solutions_seed.csv"
    ]
    
    csv_file = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_file = p
            break
            
    if not csv_file:
        print("[WARNING] maintenance_solutions.csv reference file not found under seed_data/. Skipping maintenance solutions seeding.")
        db.close()
        return

    print(f"Seeding maintenance solutions from {csv_file}...")
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                solution = row["solution"].strip()
                db_sol = db.query(models.MaintenanceSolutionCatalog).filter(
                    models.MaintenanceSolutionCatalog.solution == solution
                ).first()
                if not db_sol:
                    db_sol = models.MaintenanceSolutionCatalog(solution=solution)
                    db.add(db_sol)
                    count += 1
            db.commit()
            print(f"Successfully seeded {count} maintenance solutions.")
    except Exception as e:
        print(f"[ERROR] Failed to seed maintenance solutions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
