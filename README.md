# Muscle Hunt Gym Membership & Fee Management System

A production-minded, full-stack web application designed for gym coaches and administrators to manage members, membership plans, fee collections, renewals, dynamic expiry tracking, and daily gym attendance.

Built to run **natively on the host machine** without Docker, connecting directly to **MongoDB Atlas**.

---

## 🚀 Key Features

- **Dynamic Member Categories**: Read-time evaluation of `Paid` (>3 days), `Expiring Soon` (0–3 days, inclusive of today), and `Expired` (<0 days) based on the gym's configured timezone (`Asia/Kolkata`).
- **Calendar-Month Arithmetic**: Accurately computes month boundaries (e.g. Jan 31 + 1 month = Feb 28/29, Mar 31 + 1 month = Apr 30).
- **Time-Preserving Renewals**: Renewing before or on expiry begins the new period on the day after the old expiry, preserving paid time.
- **Dedicated Legacy Member Onboarding**:
  - Add existing members while preserving their original Member ID exactly as entered.
  - Unknown joining dates supported without inventing data.
  - Manual expiry date migration with audit logs and zero fake revenue distortion.
  - Bulk Legacy CSV Import with preview, dry-run validation, and duplicate detection.
- **Append-Only Financial Ledger**: Payments are immutable records. Audited void process with mandatory reason excludes voided transactions from revenue calculations.
- **Daily Attendance Desk**: Instant member check-in, duplicate suppression within configured time window (e.g. 2 minutes), and prominent expired member alerts.
- **Formula-Safe CSV Exports**: Prevents CSV/Spreadsheet Formula Injection (CWE-1236) by automatically sanitizing formula triggers (`=`, `+`, `-`, `@`).
- **Secure Authentication**: Bcrypt password hashing + HttpOnly cookie sessions.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.14+, FastAPI, Pydantic v2, PyMongo 4.19+ (`AsyncMongoClient`).
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Pure CSS Modules & Plain CSS. **No Tailwind CSS or Bootstrap**.
- **Database**: MongoDB Atlas (`mongodb+srv://...`).
- **Storage**: Dual-mode storage adapter (Local static disk fallback + Cloudinary integration).

---

## 📋 Prerequisites

- **Python 3.10+** (tested on Python 3.14)
- **Node.js v18+** (tested on Node v24)
- **MongoDB Atlas Connection URI**

---

## ⚡ Quickstart Setup Guide

### 1. Backend Setup (Windows PowerShell)

```powershell
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install -r requirements.txt

# Create .env from template (pre-configured with Atlas URI)
Copy-Item .env.example .env

# Run the seed CLI to initialize database indexes, default plans, and first admin
python -m app.cli.seed

# Start FastAPI development server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

FastAPI will be running at:
- **API Base**: `http://localhost:8000/api/v1`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`
- **Readiness Check**: `http://localhost:8000/ready`

---

### 2. Frontend Setup

In a separate terminal:

```powershell
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

The Next.js frontend will be running at:
- **Web App**: `http://localhost:3000`

---

## 🔑 Default Administrator Credentials

On first run, the database is provisioned with default coach credentials:
- **Username**: `coach`
- **Password**: `Coach@Gym2026!`

*(You can update or customize credentials in `backend/.env` before running the seed script).*

---

## 🧪 Automated Testing

### Backend Test Suite (Pytest)
Run the automated test suite covering all 25+ unit and integration test cases:

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -v
```

Tests verify:
- Calendar month leap-year and month-end clamping (`test_dates.py`).
- Exact dynamic category classification and boundaries (`test_status_calculation.py`).
- Time-preservation renewal rules before/on/after expiry (`test_renewal_logic.py`).
- Phone normalization and shared family phone numbers (`test_phone.py`).
- CSV formula injection sanitization (`test_csv_export.py`).
- Full API lifecycle: login, member registration, legacy registration, renewal, attendance duplicate suppression, and dashboard statistics (`test_api_integration.py`).

### Frontend Production Build Verification
```powershell
cd frontend
npm run build
```

---

## 💾 MongoDB Atlas Backup & Data Retention Guidance

1. **Atlas Automated Backups**: Enable continuous Cloud Backups or snapshot schedules in the MongoDB Atlas console (under Cluster &rarr; Backup).
2. **Financial Data Retention**: Never delete payment documents. The application enforces append-only payment storage with auditable void records (`status="voided"`) to guarantee an uncorrupted financial audit trail.
3. **Manual CLI Dump**:
   ```bash
   mongodump --uri="<MONGODB_URI>" --db=gym_management --out=./backups/$(date +%F)
   ```

