# TRIXUL Project Memory Scratchpad

## Current Focus & Status
- **Active Sprint:** Stages 1, 2, and 3 Hardened & 100% Completed
- **Target Component:** Full Stack Monorepo (`Backend`, `ETM-Interface`, `Admin-Dashboard`)
- **Master Plan Source:** `MASTER_EXECUTION_LOG.md` (Synchronized)

---

## Sub-Product Execution Trackers

### 1. Backend (`Backend/`)
- [x] Single-app `core` architecture (`models.py`, `services.py`, `views.py`, `serializers.py`, `urls.py`).
- [x] Custom SimpleJWT authentication via `EmployeeJWTAuthentication` (`authentication.py`) keyed to `emp_id`.
- [x] PostgreSQL + PostGIS integration with GeoDjango spatial queries (`Distance()`, `ST_Distance_Sphere`).
- [x] "Fat Services, Thin Views" pattern strictly enforced.
- [x] Database migrations `0002_ticket_payment_method_incident.py` and `0003_farerule_discount_percentage.py` applied.
- [x] All REST POST endpoints validated strictly via DRF Serializers before service execution.
- [x] Idempotent data seeding via `core/management/commands/seed_trixul.py` maintaining active shift states.
- [x] Safe environment template `Backend/.env.example` created.
- [x] Shift closure endpoint implemented (`POST /api/v1/admin/shifts/<shift_id>/close/`).
- [x] Incident State Machine API: `PATCH /api/v1/admin/incidents/<id>/acknowledge/` & resolve.
- [x] Mid-shift bus swap endpoint (`POST /api/v1/admin/shifts/<id>/reassign-bus/`).
- [x] ETM Batch Ingestion API (`POST /api/v1/sync/batch/`) for offline dead zones.
- [x] Shift Ticket Summary API (`GET /api/v1/ticketing/shift/<shift_id>/summary/`) for live reconciliation.
- [x] Dynamic Fare Control API (`GET` & `POST /api/v1/admin/fare-controls/`) supporting 10% midday discounts.

### 2. ETM-Interface (`ETM-Interface/`)
- [x] Zero-mock architecture — All actions communicate directly with PostgreSQL backend via Axios client.
- [x] Pure Redux store integration across 6 slices (`conductor`, `route`, `ticket`, `alerts`, `bus`, `updates`).
- [x] Rugged thumb-friendly booking UI with `+ / −` steppers for Adult Male, Women (50% Mahila Sanman), Senior Citizens (Free), and Children (50%).
- [x] Smart 3-chip "From" stop selector (`⏪ Prev` / `📍 GPS Current` / `⏩ Next`).
- [x] Fare table lookup by stop ID / stop name with distance-based dynamic fallback.
- [x] Emergency SOS broadcast integrated directly to backend `/api/v1/admin/incidents/` with offline storage fallback.
- [x] Conductor end-of-shift reconciliation card with Cash vs UPI split in Ticket History connected to live PostgreSQL records.
- [x] Rugged "Slide to SOS" swipe gesture component preventing accidental panic triggers on rough roads.
- [x] Automated Offline/Online state indicator with background batch queue ingestion.
- [x] Other Bus Routes screen connected to live backend fleet directory.
- [x] Updates screen connected to live backend road incidents and emergency warnings.
- [x] Dynamic mid-shift bus swap detection on heartbeat.

### 3. Admin-Dashboard (`Admin-Dashboard/`)
- [x] Standalone sub-project (React 18 + Vite + Tailwind CSS + Leaflet + Recharts + Lucide).
- [x] Persistent Global Revenue HUD & Active Fleet KPI banner in header across all pages.
- [x] OpenStreetMap Leaflet map with pulsing real-time bus telemetry markers.
- [x] 1-Click Short-Trip Deployment UI (Demand Surge Card) for depot managers.
- [x] Route Volume & Occupancy Chart with standard 45-passenger red-line threshold driven purely by live database queries.
- [x] Instant Shift Assignment connected directly to database conductors, buses, and routes.
- [x] Incident action controls ("Acknowledge Alert" / "Resolve") to silence flashing SOS alarms.
- [x] Mid-Shift Bus Swap UI inside Shift Management tab.
- [x] Visual Route & Stop Builder with direct map-click pin extraction and real-time route polyline linking.
- [x] Dynamic Fare Control Panel with 1-click 10% Midday Concession broadcast to active ETMs.

---

## Key System Architecture Rules Locked
- **Monorepo Boundaries:** No Node dependencies in `Backend/`, no Django code in frontends.
- **Data Integrity:** Absolutely zero fake/mock data layers (`mockApi.js`, `mockData.js`). All states pull from live PostgreSQL queries.
- **Contract Enforcement:** Backend `snake_case` serialized into frontend models or normalized at service boundaries.
- **Incident State Machine:** Incidents must progress `OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`.
- **Engineering Scaling Rule:** Push real-time fleet GPS via WebSockets (Django Channels) rather than HTTP polling at scale.

---

## Active Immediate Tasks (Stage 3 Technical Fixes)
1. **Incident State Machine (`PATCH /api/v1/admin/incidents/<id>/status/`)**: Allow admin to Acknowledge/Resolve alarms to prevent alert fatigue.
2. **Mid-Shift Reassignment Protocol**: Enable bus swaps on breakdowns without resetting shift revenue logs.
3. **Django Channels & WebSocket Setup**: ASGI upgrade for real-time fleet push.
