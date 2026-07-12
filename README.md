# TransitOps — Smart Transport Operations Platform

TransitOps is a full-stack, enterprise-grade cargo/goods fleet management platform. The application is built with a modular OOP backend architecture (FastAPI + SQLAlchemy), native browser AES-GCM client-side encryption for secure driver PII data, and a modern, high-performance React + TypeScript frontend.

---

## 🚀 Quick Start Guide (Local Development)

Follow these steps to run the application on your system with PostgreSQL.

### 1. Database Setup (PostgreSQL)
Ensure your PostgreSQL instance is running. 
> [!NOTE]
> The local database config is configured to connect to PostgreSQL on **port `5433`** with password `XYZ=octa` as defined in `backend/.env`.

Run the database creation script:
```bash
# Navigate to backend directory
cd backend

# Create virtual environment if you haven't already
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create the postgres database (transitopsDB)
python create_db.py

# Seed all database tables (catalogs + rich mock operational data)
python seed.py
```

### 2. Start the Backend API
Run the backend FastAPI server locally on port `8000`:
```bash
uvicorn app.main:app --reload --port 8000
```
- **Interactive Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Run Backend Tests
Verify database constraints, auth flows, and business rules:
```bash
python -m pytest
```

### 4. Start the Frontend client
Open a new terminal window to build and start the React client:
```bash
# Navigate to frontend directory
cd frontend

# Install Node modules
npm install

# Start Vite developer server
npm run dev
```
- **Web App URL**: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Demo Login Credentials

You can log into the system with any of the following 4 roles. All roles use the password: **`Password123!`**

| Email Address | Role Name | Allowed Operations |
|---|---|---|
| **`fleet.manager@transitops.dev`** | **Fleet Manager** | Full access (CRUD vehicles/drivers, trip creation, dispatch, fuel/expense, maintenance logs, dashboard analytics) |
| **`driver@transitops.dev`** | **Driver** | Create/Dispatch/Cancel/Complete Trips, view maps, log fuel & expenses, and access standard operational screens |
| **`safety@transitops.dev`** | **Safety Officer** | Read vehicles/drivers/reports, suspend drivers, and view security compliance and activity logs |
| **`finance@transitops.dev`** | **Financial Analyst** | Read vehicle lists, check operational costs/dashboard stats, and view ROI reports |

---

## 🔒 Zero-Knowledge Encryption Model

For driver compliance, sensitive PII data (`driver.license_number` and `driver.contact_number`) is encrypted **client-side** in the browser using the **Web Crypto API (256-bit AES-GCM)**:
- **Key Derivation**: During login, a symmetric key is derived from the user's password and email using PBKDF2 (100,000 iterations, SHA-256).
- **Security Boundary**: The backend database only stores Base64 ciphertext and IV. Plaintext data never touches the server.
- **Seeded Mock Data**: Driver records in the seed script have been pre-encrypted using the `fleet.manager@transitops.dev` user's key derivation parameters. When logged in as the Fleet Manager, you will see all driver licenses and contact details decrypted in real-time. Other roles will show the encrypted ciphertext, illustrating the zero-knowledge security boundary.

---

## 📦 What gets seeded?
Running `python seed.py` populates a comprehensive, lifelike dataset:
1. **Locations**: Seeds standard Indian geographic coordinates (Delhi area).
2. **Vehicle Catalog**: 13 cargo carriers (brands like Tata, Ashok Leyland, Mahindra).
3. **Mock Vehicles**: 5 active fleet vehicles (Tata Ace, Bolero Pik-Up, etc.) in various statuses (*Available*, *On Trip*, *In Shop*).
4. **Mock Drivers**: 5 compliant drivers with valid categories (LMV-TR, HMV, HGMV).
5. **Mock Trips**: 4 real-world trips in different life-cycle phases (*Draft*, *Dispatched*, *Completed*, *Cancelled*).
6. **Maintenance Logs**: Logs for service repairs, including active maintenance tickets that correctly set vehicle status to *In Shop*.
7. **Fuel & Toll Expenses**: Detailed expense items mapped to completed trips for accurate ROI calculation on the Reports page.
8. **Activity Monitor Logs**: Populates the audit log trail for user operations.
