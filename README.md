# TransitOps — Smart Transport Operations Platform

TransitOps is a full-stack fleet management platform designed exclusively for cargo/goods fleet operations. It features OOP service/repository abstractions, native browser AES-GCM client-side encryption for sensitive PII data, dynamic activity monitors (audit logs), reference seed files, and a multi-container Docker compose orchestrator.

---

## Architecture & OOP Abstraction Notes

The backend has been structured using a modular layered architecture (`Routers -> Services -> Repositories -> SQLAlchemy Models`):
- **BaseRepository Interface (`BaseRepository[T]`)**: Sourced as a generic abstract base class utilizing Python's `abc.ABC` and `typing.Generic`. Subclasses like `VehicleRepository` inherit standard database operations (`get`, `list`, `create`, `update`, `delete`), separating SQL query configurations from routes.
- **Service Layer**: Handles business logic. Subclasses (`TripService`, `MaintenanceService`, etc.) execute constraints like vehicle capacity check logic, status transition locks, and license class validation.
- **Polymorphism & Abstraction**: Defined by the abstract `NotificationService` interface and its concrete subclasses (e.g. `EmailNotificationService`). This decouples alerts from notification targets, allowing future extensions (like SMS/Slack integrations) to be swapped in without modifying main code block.
- **Encapsulation**: State mutations (e.g. converting a vehicle to `In Shop` when a maintenance log is created, or locking vehicles and drivers to `On Trip` upon trip dispatch) are encapsulated strictly inside service boundaries.

---

## Zero-Knowledge Encryption Model (Tradeoffs)

We use the browser's native Web Crypto API (`AES-GCM` 256-bit) to encrypt `driver.license_number` and `driver.contact_number` client-side:
- **Key Derivation**: During login, the password entered is combined with the user's email as salt using `PBKDF2` to generate the symmetric key.
- **Key Storage Choice & Tradeoffs**:
  - We store the password transiently in `sessionStorage` (cleared automatically when the browser tab is closed) to re-derive the key upon page refresh.
  - **Tradeoff Profile**:
    - *passphrase entered locally* (zero-knowledge): The backend never sees the encryption key or plaintext PII.
    - *data recovery*: Since the key is derived from the user's password, if the password is changed, older records remain encrypted with the previous key unless re-encrypted. If the password is forgotten, the PII data is unrecoverable.
    - *backend visibility*: The backend and database only see Base64 ciphertext, preserving privacy even in case of database breaches.

---

## Role-Based Access Control (RBAC) Matrix

| Route Group | Action | Fleet Manager | Driver | Safety Officer | Financial Analyst |
|---|---|---|---|---|---|
| **/vehicles** | Create/Update/Delete | ✅ | — | — | — |
| | Read List / Pool | ✅ | ✅ | ✅ | ✅ |
| **/drivers** | Create/Update | ✅ | — | ✅ | — |
| | Suspend Driver | — | — | ✅ | — |
| | Read List / Pool | ✅ | ✅ | ✅ | ✅ |
| **/trips** | Create/Dispatch/Complete/Cancel | ✅ | ✅ | — | — |
| | Read List | ✅ | ✅ | — | — |
| **/maintenance** | Create/Close logs | ✅ | — | — | — |
| **/fuel-expense** | Log Fuel / Toll | ✅ | ✅ | — | — |
| | Check Operational Cost | ✅ | — | — | ✅ |
| **/activity-logs** | Read / Export CSV | ✅ | — | ✅ | — |
| **/reports** | View ROI Summary / Export | ✅ | — | ✅ | ✅ |

---

## Seed Data Catalogs & Usage

Reference catalogs are loaded idempotently from `seed_data/` files during backend startup (via `python seed.py`). If a CSV file is missing, the system prints a warning and skips seeding gracefully.

1. **`locations.csv`**: Seeds `locations` table. Checks source/destination pincodes on Trips, auto-calculating planned routes using the haversine formula.
2. **`vehicle_catalog.csv`**: Seeds cargo carrier designs. Governs dropdown templates and pre-fills limits and minimum licenses required for drivers.
3. **`maintenance_issues.csv`**: Seeds issue classifications. Used when creating repair tickets.
4. **`maintenance_solutions.csv`**: Seeds ticket solutions. Used when closing repair tickets.
5. **`license_categories.csv`**: Seeds category mappings (`LMV-TR`, `HMV`, `HGMV`).
6. **`fuel_price_reference.csv`**: Sourced for regional fuel pricing calculations.

---

## Quick Start (Docker Compose)

Launch the entire stack with one command:
```bash
docker-compose up --build
```
- **Frontend Developer Client**: `http://localhost:5173`
- **Backend API Server**: `http://localhost:8000/docs`

### Demo Logins (Password for all: `Password123!`):
- Fleet Manager: `fleet.manager@transitops.dev`
- Driver User: `driver@transitops.dev`
- Safety Officer: `safety@transitops.dev`
- Financial Analyst: `finance@transitops.dev`

### Running Tests:
Verify database rules and constraints:
```bash
docker-compose exec backend pytest
```
