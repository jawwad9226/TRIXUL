# TRIXUL Project Memory Scratchpad

## Current Focus & Status
- **Active Sprint:** Stage 3 (Admin Command Center Integration) & ETM Ground-Truth Handshake
- **Target Component:** Full Stack Monorepo (`Backend`, `ETM-Interface`, `Admin-Dashboard`)
- **Initialized At:** 2026-11-06 (Post-Rule Initialization Protocol)

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

### 2. ETM-Interface (`ETM-Interface/`)
- [x] Zero-mock architecture — All actions communicate directly with PostgreSQL backend via Axios client.
- [x] Pure Redux store integration across 6 slices (`conductor`, `route`, `ticket`, `alerts`, `logs`, `auth`).
- [x] Rugged thumb-friendly booking UI with `+ / −` steppers for Adult Male, Women (50% Mahila Sanman), Senior Citizens (Free), and Children (50%).
- [x] Smart 3-chip "From" stop selector (`⏪ Prev` / `📍 GPS Current` / `⏩ Next`).
- [x] Fare table lookup by stop ID / stop name with distance-based dynamic fallback.
- [x] Emergency SOS broadcast integrated directly to backend `/api/v1/admin/incidents/` with offline storage fallback.
- [x] Conductor end-of-shift reconciliation card with Cash vs UPI split in Ticket History.

### 3. Admin-Dashboard (`Admin-Dashboard/`)
- [x] Standalone sub-project (React 18 + Vite + Tailwind CSS + Leaflet + Recharts + Lucide).
- [x] Persistent Global Revenue HUD & Active Fleet KPI banner in header across all pages.
- [x] CartoDB Dark Matter Leaflet map with pulsing real-time bus telemetry markers (10s cadence).
- [x] AI Health Engine & Alert Stream: Demand Surge detection (short-trip deployment trigger), excessive idling telematics, and active SOS triage.
- [x] Instant Shift Assignment connected directly to database conductors, buses, and routes (`/api/v1/admin/dispatch-options/`).
- [x] Route Volume & Occupancy Chart with standard 45-seated capacity threshold line.
- [x] Production build clean (`npm run build` with 0 errors).

---

## Key System Architecture Rules Locked
- **Monorepo Boundaries:** No Node dependencies in `Backend/`, no Django code in frontends.
- **Data Integrity:** Absolutely zero fake/mock data layers (`mockApi.js`, `mockData.js`). All states pull from live PostgreSQL queries.
- **Contract Enforcement:** Backend `snake_case` serialized into frontend models or normalized at service boundaries.
- **Hardware Agnostic:** ETM and Admin run pure web/mobile software stack; physical thermal printer / NFC drivers deferred to hardware integration phase.

---

## Active Blockers & Known Issues
- [ ] **Real-time WebSockets:** Backend currently serves telemetry and fleet updates via 10-second polling cadence. Future sprint to introduce `channels` + `daphne` ASGI layer.
- [ ] **Network State Indicator:** Install `@react-native-community/netinfo` in ETM-Interface to dynamically display `OFFLINE (X queued)` during highway dead zones.
- [ ] **Batch Sync Endpoint:** Add `POST /api/v1/sync/batch/` on backend for atomic flush of queued offline tickets when returning from connectivity dead zones.
