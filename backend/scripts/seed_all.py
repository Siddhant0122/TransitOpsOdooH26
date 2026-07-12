import os
import sys

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts import (
    seed_demo_users,
    seed_locations,
    seed_vehicle_catalog,
    seed_maintenance_issues,
    seed_maintenance_solutions,
    seed_license_categories,
    seed_fuel_price
)

def main():
    print("====== STARTING FULL DATA SEEDING ======")
    seed_demo_users.run_seed()
    seed_locations.run_seed()
    seed_vehicle_catalog.run_seed()
    seed_maintenance_issues.run_seed()
    seed_maintenance_solutions.run_seed()
    seed_license_categories.run_seed()
    seed_fuel_price.run_seed()
    print("====== SEEDING SEQUENCE COMPLETED ======")

if __name__ == "__main__":
    main()
