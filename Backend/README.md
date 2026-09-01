# TRIXUL Backend — Setup Guide

A live public transport tracking and ticketing backend built with **Django**, **Django REST Framework**, and **PostgreSQL + PostGIS**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.10+ |
| Framework | Django 4.2 + Django REST Framework |
| Database | PostgreSQL 14+ with PostGIS extension |
| Cache | Redis (optional — falls back to local memory) |
| Auth | JWT via `djangorestframework-simplejwt` |

---

## Quick Start (Linux/macOS)

```bash
# 1. Clone the repo and navigate to Backend
cd TRIXUL/Backend

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Copy the environment template and fill in your details
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 5. Run migrations
python manage.py migrate

# 6. Create a superuser (optional, for admin panel)
python manage.py createsuperuser

# 7. Start the development server
python manage.py runserver 0.0.0.0:8000
```

---

## Setup on Windows

> [!IMPORTANT]
> GeoDjango requires **GDAL** and **GEOS** binaries. On Windows you must install these BEFORE running `pip install`.

### Step 1 — Install OSGeo4W (GDAL)

1. Download the OSGeo4W installer: https://trac.osgeo.org/osgeo4w/
2. Run the installer → choose "Express Desktop Install"
3. Select at minimum: **GDAL**, **GEOS**, **PROJ**
4. Add to your Windows `PATH`:
   ```
   C:\OSGeo4W\bin
   ```
5. Verify with: `gdalinfo --version`

### Step 2 — Install PostgreSQL + PostGIS

1. Download PostgreSQL: https://www.postgresql.org/download/windows/
2. During install, also install the **Stack Builder**
3. Use Stack Builder to install **PostGIS** for your PostgreSQL version
4. Create the database:
   ```sql
   CREATE DATABASE trixul_db;
   \c trixul_db
   CREATE EXTENSION postgis;
   ```

### Step 3 — Configure and Run

```bat
# In Command Prompt or PowerShell (activate venv first)
cd TRIXUL\Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in .env
copy .env.example .env
# Edit .env in Notepad with your PostgreSQL password

python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

---

## Environment Variables

| Key | Description | Default |
|-----|-------------|---------|
| `SECRET_KEY` | Django secret key | (insecure default) |
| `DEBUG` | Enable debug mode | `True` |
| `DB_NAME` | PostgreSQL database name | `trixul_db` |
| `DB_USER` | PostgreSQL user | `trixul_admin` |
| `DB_PASSWORD` | PostgreSQL password | *(empty)* |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `CACHE_BACKEND` | Cache backend class | `locmem` (no Redis needed) |
| `CACHE_URL` | Redis URL (if using Redis) | `redis://127.0.0.1:6379/1` |

---

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v1/auth/login/` | Login with emp_id, receive JWT | No |
| `GET` | `/api/v1/routes/<route_id>/` | Fetch route stops and fares | No |
| `POST` | `/api/v1/telemetry/heartbeat/` | Send live GPS location | JWT |
| `POST` | `/api/v1/ticketing/issue/` | Issue and log a ticket | JWT |

---

## Running the Backend Simulation Tool

```bash
python manage.py simulate_telemetry --shift_id shift-102-1001-M
```

This simulates a bus moving between stops and prints PostGIS distance math to the console.

---

## Architecture

```
core/
├── settings.py      # All config loaded from .env
├── urls.py          # Mounts api/ under /api/
api/
├── models.py        # Employee, Bus, Stop, Route, RouteStop, FareRule, Shift, Ticket, BusLocation
├── serializers.py   # Input validation for all endpoints
├── views.py         # Thin HTTP handlers only
├── services.py      # All business logic & PostGIS queries
├── authentication.py # Custom JWT → Employee model resolution
└── admin.py         # Django admin registration
```
