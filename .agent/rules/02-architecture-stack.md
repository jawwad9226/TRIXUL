# 02-architecture-stack.md — Stack Specifications & Anti-Sycophancy Rules

## 1. Project Directory Layout & Boundaries
TRIXUL is organized as a multi-product monorepo. Code and rules must strictly respect directory boundaries:

- `Backend/`: Central Brain API (Python 3.13, Django 4.2+, Django REST Framework, GeoDjango, PostgreSQL + PostGIS).
- `ETM-Interface/`: Conductor App (React Native, Expo, Redux Toolkit, Axios).
- `Admin-Dashboard/`: Depot Management Command Center (HTML/JS/React, Tailwind CSS, Leaflet.js, Chart.js).
- `Presentation/`: Live demo slides & presentation assets.

> **Rule:** Never leak Node.js or npm dependencies into `Backend/`. Never leak Django app folders into frontend directories.

---

## 2. Backend Architectural Patterns (`Backend/`)

### "Fat Services, Thin Views" Pattern
- **`Backend/core/views.py`:** Kept strictly thin. Used only for HTTP routing, permission handling, and returning DRF `Response` objects.
- **`Backend/core/services.py`:** Contains ALL business logic, spatial PostGIS queries (`Distance()`, `ST_Distance_Sphere`), fare calculations, and telemetry processing.
- **`Backend/core/serializers.py`:** Responsible for payload validation, payload transformation, and contract enforcement.
- **`Backend/core/models.py`:** Single source of truth for database schema. Standardized on the `core` app (never create duplicate `api` app models).

### Spatial & GIS Handling
- All GPS positions (`gps_location`, `current_location`) must use GeoDjango `PointField` with SRID 4326.
- Database spatial computations must be executed in PostgreSQL/PostGIS, never in Python application-layer `for` loops.

### Authentication Standard
- Use custom SimpleJWT authentication via `EmployeeJWTAuthentication` (`Backend/core/authentication.py`).
- Map JWT `user_id` tokens directly to `Employee.objects.get(emp_id=user_id)` rather than Django's default `auth.User`.

---

## 3. Frontend Architectural Patterns (`ETM-Interface/`)

### State & API Management
- **Redux Toolkit (`src/store/slices/`):** All UI screens must read global state via `useSelector` and trigger updates via `useDispatch`.
- **API Requests (`src/services/api.js`):** All network calls must pass through the configured API client using standard environment configuration (`EXPO_PUBLIC_API_URL`).

### Anti-Sycophancy & Realism Directive
- **Zero Mock Data:** Never generate or import `mockApi.js`, `mockData.js`, or static fake JSON wrappers.
- **No Silent Failures:** If a backend endpoint returns `400` or `500`, surface the real error handling in the UI/Redux slice. Do not fallback to hardcoded test strings.
- **Contract Casing:** Match backend fields (`snake_case`) or explicitly transform them in `serializers.py` / `api.js`.