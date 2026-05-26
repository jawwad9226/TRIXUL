# TRIXUL Backend - Local Setup Guide (Windows)

Welcome to the TRIXUL backend! This guide will help you set up the project on your local Windows machine. 
The backend is built with Django, Django REST Framework, and requires PostgreSQL (with PostGIS enabled) and Redis.

## 📋 Prerequisites

Before you start, make sure you have the following installed on your Windows machine:
1. **Python 3.10+**: Download from [python.org](https://www.python.org/downloads/). *Ensure you check "Add Python to PATH" during installation.*
2. **PostgreSQL & PostGIS**: 
   - Download the Windows installer from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
   - During the PostgreSQL installation, use the Stack Builder (which opens at the end) to install the **PostGIS** extension under "Spatial Extensions".
3. **Redis for Windows**: 
   - Since Redis is natively for Linux, you have two options on Windows:
     - **Option A (Recommended)**: Use [WSL2 (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install) and run `sudo apt install redis-server && sudo service redis-server start` inside the WSL terminal.
     - **Option B**: Download a pre-compiled Windows port like [Memurai](https://www.memurai.com/) or an older [MSOpenTech Redis port](https://github.com/microsoftarchive/redis/releases).

## 🗄️ Database Setup

1. Open **pgAdmin** (installed with PostgreSQL) or use the `psql` command line.
2. Create a database named `trixul_db`.
3. Create a user named `trixul_admin` with the password `secure_password_123` and grant them privileges to `trixul_db`.
4. Enable the PostGIS extension on the new database. You can do this by running this query inside `trixul_db`:
   ```sql
   CREATE EXTENSION postgis;
   ```

## 🚀 Installation

1. **Clone the repository** (or extract the folder) and open a Command Prompt or PowerShell in the `Backend` directory.
   ```cmd
   cd path\to\TRIXUL\Backend
   ```

2. **Create a Virtual Environment**:
   ```cmd
   python -m venv venv
   ```

3. **Activate the Virtual Environment**:
   ```cmd
   venv\Scripts\activate
   ```
   *(Note: You should see `(venv)` appear at the beginning of your command prompt line).*

4. **Install Dependencies**:
   Ensure you are using the activated virtual environment, then install the required Python packages:
   ```cmd
   pip install -r requirements.txt
   ```

## ⚙️ Running Migrations & Seeding Data

Now that the environment and database are ready, prepare the database schema:

1. **Apply Migrations**:
   ```cmd
   python manage.py makemigrations
   python manage.py migrate
   ```

2. **Seed the Mock Data**:
   We have a custom management command to automatically populate the database with testing routes, stops, buses, and employees.
   ```cmd
   python manage.py seed_trixul
   ```

3. **Create a Superuser (Optional)**:
   If you want to access the Django Admin panel:
   ```cmd
   python manage.py createsuperuser
   ```

## 🏃 Running the Server

1. Ensure **Redis** is running in the background.
2. With your virtual environment activated, start the Django development server:
   ```cmd
   python manage.py runserver 0.0.0.0:8000
   ```

The backend is now accessible at `http://127.0.0.1:8000/`.

## 📌 API Endpoints

You can test the endpoints using Postman or ThunderClient:
- **Login**: `POST /api/v1/auth/login/` (Use `emp_id`: "cond-1001" to get JWT tokens)
- **Route Init**: `GET /api/v1/routes/route-102/`
- **Telemetry**: `POST /api/v1/telemetry/heartbeat/` *(Requires JWT Auth)*
- **Ticketing**: `POST /api/v1/ticketing/issue/` *(Requires JWT Auth)*

## 💡 Troubleshooting on Windows
- If you get `GEOS API` or `GDAL` missing errors, Windows requires specific GeoDjango spatial libraries. Install them via OSGeo4W or set the `GEOS_LIBRARY_PATH` and `GDAL_LIBRARY_PATH` in `settings.py` pointing to your PostgreSQL installation's PostGIS `bin` folder.
