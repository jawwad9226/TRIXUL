# TRIXUL Project Memory Scratchpad

## Current Focus & Status
- **Active Sprint:** Stage 3 (Admin Command Center Hardening & Critical Technical Fixes)
- **Target Component:** Full Stack Monorepo (`Backend`, `ETM-Interface`, `Admin-Dashboard`)
- **Master Plan Source:** `MASTER_EXECUTION_LOG.md` (Synchronized)

---

## Sub-Product Execution Trackers

### 1. Backend (`Backend/`)
- [x] Single-app `core` architecture (`models.py`, `services.py`, `views.py`, `serializers.py`, `urls.py`).
- [x] Custom SimpleJWT authentication via `EmployeeJWTAuthentication` (`authentication.py`) keyed to `emp_id`.
- [x] PostgreSQL + PostGIS integration with GeoDjango spatial queries (`Distance()`, `ST_Distance_Sphere`).
- [x] "Fat Services, Thin Views" pattern strictly enforced.
- [x] Database migration `0002_ticket_payment_method_incident.py` applied (`payment_method` on `Ticket`, `Incident` model).
- [x] All REST POST endpoints validated strictly via DRF Serializers before service execution.
- [x] Idempotent data seeding via `core/management/commands/seed_trixul.py` using `get_or_create()`.
- [x] Safe environment template `Backend/.env.example` created.
- [x] Shift closure endpoint implemented (`POST /api/v1/admin/shifts/<shift_id>/close/`).
- [x] Incident State Machine API: `PATCH /api/v1/admin/incidents/<id>/acknowledge/` & resolve.
- [x] Mid-shift bus swap endpoint (`POST /api/v1/admin/shifts/<id>/reassign-bus/`).
- [ ] WebSockets via Django Channels (`asgi.py`, channels routing) for real-time fleet push.
- [ ] ETM Batch Ingestion API (`POST /api/v1/sync/batch/`).

### 2. ETM-Interface (`ETM-Interface/`)
- [x] Zero-mock architecture — All actions communicate directly with PostgreSQL backend via Axios client.
- [x] Pure Redux store integration across 6 slices (`conductor`, `route`, `ticket`, `alerts`, `logs`, `auth`).
- [x] Rugged thumb-friendly booking UI with `+ / −` steppers for Adult Male, Women (50% Mahila Sanman), Senior Citizens (Free), and Children (50%).
- [x] Smart 3-chip "From" stop selector (`⏪ Prev` / `📍 GPS Current` / `⏩ Next`).
- [x] Fare table lookup by stop ID / stop name with distance-based dynamic fallback.
- [x] Emergency SOS broadcast integrated directly to backend `/api/v1/admin/incidents/` with offline storage fallback.
- [x] Conductor end-of-shift reconciliation card with Cash vs UPI split in Ticket History.
- [ ] Refine "Slide to SOS" gesture component for rough highway roads.
- [ ] Integrate `@react-native-community/netinfo` for automated Offline/Online state indicator.

### 3. Admin-Dashboard (`Admin-Dashboard/`)
- [x] Standalone sub-project (React 18 + Vite + Tailwind CSS + Leaflet + Recharts + Lucide).
- [x] Persistent Global Revenue HUD & Active Fleet KPI banner in header across all pages.
- [x] CartoDB Dark Matter Leaflet map with pulsing real-time bus telemetry markers.
- [x] 1-Click Short-Trip Deployment UI (Demand Surge Card) for depot managers.
- [x] Route Volume & Occupancy Chart with standard 45-passenger red-line threshold.
- [x] Instant Shift Assignment connected directly to database conductors, buses, and routes.
- [x] Incident action controls ("Acknowledge Alert" / "Resolve") to silence flashing SOS alarms.
- [x] Mid-Shift Bus Swap UI inside Shift Management tab.
- [x] Visual Route & Stop Builder with direct map-click pin extraction and real-time route polyline linking.
- [x] Switched all maps from watermarked CartoDB tiles to clean OpenStreetMap tiles.
- [ ] WebSocket client hook for live radar stream (migrating from 10s polling).
- [ ] Dynamic Fare Control toggle panel (pushing concession/discount rates to active ETMs).

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
