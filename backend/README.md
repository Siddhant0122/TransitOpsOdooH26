# TransitOps backend (FastAPI + SQLAlchemy)

Tested end-to-end — boots clean, all endpoints wired, every business rule in the
spec verified against the example workflow (Van-05 / Alex / 450kg trip).

## Quick start

```bash
pip install -r requirements.txt --break-system-packages   # or use a venv
python seed.py                                             # creates 4 roles + demo users
uvicorn app.main:app --reload --port 8000
```

Swagger UI: `http://localhost:8000/docs`
SQLite file `transitops.db` is created automatically — zero setup for the hackathon.
To use Postgres instead, set `DATABASE_URL=postgresql://user:pass@host:5432/transitops`
before starting.

**Demo logins** (password for all: `Password123!`):
| Email | Role |
|---|---|
| fleet.manager@transitops.dev | Fleet Manager |
| driver@transitops.dev | Driver |
| safety@transitops.dev | Safety Officer |
| finance@transitops.dev | Financial Analyst |

## Project layout

```
app/
  database.py        SQLAlchemy engine/session
  models.py           8 entities: Role, User, Vehicle, Driver, Trip,
                       MaintenanceLog, FuelLog, Expense
  schemas.py           Pydantic request/response models
  auth.py               password hashing, JWT issue/verify, RequireRole(...) RBAC dependency
  routers/
    auth_router.py     /auth/register, /auth/login, /auth/me
    vehicles.py         CRUD + /vehicles/dispatch-pool
    drivers.py           CRUD + /drivers/dispatch-pool + /drivers/expiring-licenses
    trips.py               create/dispatch/complete/cancel — all validation lives here
    maintenance.py     create + close, with vehicle status side-effects
    fuel_expense.py     fuel logs, expenses, per-vehicle operational cost
    dashboard.py         KPIs, vehicle-summary report, CSV export
seed.py                 bootstraps roles + one demo user per role
```

## RBAC matrix

| Action | Fleet Manager | Driver | Safety Officer | Financial Analyst |
|---|---|---|---|---|
| Vehicle CRUD | ✅ | read-only | read-only | read-only |
| Driver create/edit | ✅ | read-only | ✅ | read-only |
| Suspend driver | — | — | ✅ | — |
| Create/dispatch/complete/cancel trip | ✅ | ✅ | — | — |
| Maintenance create/close | ✅ | — | — | — |
| Log fuel/expense | ✅ | ✅ | — | — |
| View operational cost | ✅ | — | — | ✅ |
| Dashboard/reports/CSV | all authenticated roles (read) |

RBAC is enforced with `Depends(auth.RequireRole(RoleName.X, RoleName.Y))` on each
router — add/remove roles per endpoint as your team's actual permission model
firms up; this is a reasonable hackathon default, not gospel.

## Where the business rules live

All of section 4 ("Mandatory Business Rules") is enforced in `trips.py` and
`maintenance.py`, not just at the database level:
- Uniqueness (reg number, license number) → checked in the `POST` handlers, backed
  by a DB `unique=True` constraint as a second line of defense.
- Capacity, status, and license-expiry checks happen in `create_trip` **and** are
  re-checked in `dispatch_trip` (in case state changed between draft and dispatch —
  e.g. two people try to dispatch the same driver).
- Status transitions (dispatch → On Trip, complete → Available, cancel → restore,
  maintenance open → In Shop / close → Available) are all explicit in the router
  functions, not hidden in signals/triggers, so they're easy to read and demo.

## What's not built (by design, given 8 hours)

- Alembic migrations aren't wired up — `Base.metadata.create_all` is enough for a
  hackathon demo. Add Alembic if you need real migrations post-hackathon.
- Revenue isn't in the spec's entity list, so the ROI formula in
  `reports/vehicle-summary` uses `revenue = 0`. Add a `revenue` field to `Trip` (or
  a rate card) and wire it in — the formula is already correct, just the input.
- PDF export, email reminders, document management, dark mode — bonus features,
  intentionally left for last per the spec's own priority ordering.

## Suggested 8-hour allocation given what's already done

This scaffold covers auth/RBAC, CRUD, trip validation, status transitions,
fuel/expense, dashboard KPIs, and CSV export — i.e., everything in your "core"
list. Remaining hours should go to:
1. React frontend wired to these endpoints (JWT in localStorage/memory, role-based
   route guards, dispatch pool dropdowns using `/vehicles/dispatch-pool` and
   `/drivers/dispatch-pool` so invalid selections are impossible in the UI, not
   just rejected by the API).
2. Charts on the dashboard (Recharts against `/dashboard/kpis` and
   `/reports/vehicle-summary`).
3. Polish/bonus features only if time remains, per the spec's own note.
