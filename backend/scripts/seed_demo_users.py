import os
import sys

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app import models, auth

def run_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    DEMO_USERS = [
        ("fleet.manager@transitops.dev", "Password123!", "Fay Fleet", models.RoleName.FLEET_MANAGER),
        ("driver@transitops.dev", "Password123!", "Dan Driver", models.RoleName.DRIVER_ROLE),
        ("safety@transitops.dev", "Password123!", "Sam Safety", models.RoleName.SAFETY_OFFICER),
        ("finance@transitops.dev", "Password123!", "Fin Analyst", models.RoleName.FINANCIAL_ANALYST),
    ]

    print("Seeding roles and demo users...")
    try:
        for email, password, name, role_name in DEMO_USERS:
            role = db.query(models.Role).filter(models.Role.name == role_name).first()
            if not role:
                role = models.Role(name=role_name)
                db.add(role)
                db.flush()

            if not db.query(models.User).filter(models.User.email == email).first():
                db.add(models.User(
                    email=email,
                    password_hash=auth.hash_password(password),
                    full_name=name,
                    role_id=role.id,
                ))

        db.commit()
        print("Successfully seeded roles + demo users (password for all: Password123!):")
        for email, _, _, role_name in DEMO_USERS:
            role_val = role_name.value if hasattr(role_name, "value") else str(role_name)
            print(f"  {email}  ->  {role_val}")
    except Exception as e:
        print(f"[ERROR] Failed to seed demo users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
