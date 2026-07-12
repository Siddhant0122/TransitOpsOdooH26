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
        "seed_data/maintenance_issues_seed.csv",
        "../seed_data/maintenance_issues_seed.csv",
        "../../seed_data/maintenance_issues_seed.csv"
    ]
    
    csv_file = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_file = p
            break
            
    if not csv_file:
        print("[WARNING] maintenance_issues.csv reference file not found under seed_data/. Skipping maintenance issues seeding.")
        db.close()
        return

    print(f"Seeding maintenance issues from {csv_file}...")
    try:
        with open(csv_file, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                issue_type = row["issue_type"].strip()
                db_issue = db.query(models.MaintenanceIssueCatalog).filter(
                    models.MaintenanceIssueCatalog.issue_type == issue_type
                ).first()
                if not db_issue:
                    db_issue = models.MaintenanceIssueCatalog(issue_type=issue_type)
                    db.add(db_issue)
                    count += 1
            db.commit()
            print(f"Successfully seeded {count} maintenance issues.")
    except Exception as e:
        print(f"[ERROR] Failed to seed maintenance issues: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
