# TRIXUL Project Memory Scratchpad

## Current Focus & Status
- **Active Sprint:** Stage 4A Swayam Yatri prototype; security hardening remains open for Stages 1-3.
- **Target Component:** Full Stack Monorepo (`Backend`, `ETM-Interface`, `Admin-Dashboard`, `User_Swaym-Yatri`)
- **Master Plan Source:** `MASTER_EXECUTION_LOG.md` (Synchronized)

---

## Sub-Product Execution Trackers

### 1. Backend (`Backend/`)
- [x] Single-app `core` architecture (`models.py`, `services.py`, `views.py`, `serializers.py`, `urls.py`).
- [x] Custom SimpleJWT authentication via `EmployeeJWTAuthentication` (`authentication.py`) keyed to `emp_id`; the current login accepts an employee ID without a second credential and is not production-safe.
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
- [x] Backend API integration for ETM workflows; security review found missing authorization on operational API endpoints.
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
- **Data Integrity:** Keep production operational data separate from demo fixtures. Swayam Yatri intentionally uses static demo fixtures; do not describe them as live telemetry.
- **Contract Enforcement:** Backend `snake_case` serialized into frontend models or normalized at service boundaries.
- **Incident State Machine:** Incidents must progress `OPEN` -> `ACKNOWLEDGED` -> `RESOLVED`.
- **Engineering Scaling Rule:** Push real-time fleet GPS via WebSockets (Django Channels) rather than HTTP polling at scale.

---

## Active Immediate Tasks
1. **Backend access control:** Add authentication and role/ownership authorization to operational and admin APIs.
2. **ETM transport:** Require HTTPS for non-loopback API traffic carrying JWTs.
3. **Conductor authentication and deployment settings:** Replace ID-only JWT issuance and verify explicit production secrets, hosts, debug, and CORS settings.
4. **Swayam Yatri data boundary:** Keep the current OTP flow debug-only and commuter fixtures clearly labeled until real schedule/telemetry contracts exist.

---

## Swayam Yatri Status — 2026-11-25
- **Current Focus:** Keep commuter prototype labels accurate about fixture data.
- **Completed:** Browser and Expo dashboards now distinguish demo bus examples and illustrative ETAs from live service; client polling time is labeled as a data check.
- **Unchanged:** Swayam Yatri backend remains an isolated static-demo API. No live telemetry, schedules, crowd-sense, or map integration was added.
- **Validation:** Website lint, Expo Android export, 14 isolated API tests, Django system check, and conflict-marker check passed. Details are logged in `User_Swaym-Yatri/document.md`.

## Swayam Yatri Status — 2026-11-27
- **Current Focus:** Make the commuter dashboard's selected-bus status easier to understand while preserving route, bus, and boarding-stop selection.
- **Completed:** Web and Expo dashboards present the arrival estimate first, then explain the current stop, speed, check time, and demo/staleness state in plain language. “Bus is here” replaces a confusing zero-minute estimate at the boarding stop; redundant ETA UI and obsolete styles were removed. Expo web bundling dependencies (`react-dom`, `react-native-web`) are installed and declared.
- **Unchanged:** The commuter backend still serves static demo fixtures. No live telemetry, official timetable, crowd-sense, or geographic map integration is implemented. Development-only OTP endpoints are present; they are not production authentication.
- **Validation:** Website lint, Expo web/Android exports, and browser route/bus/boarding-stop checks passed; the card fits mobile and desktop widths. The Django CORS preflight returns the expected header for Expo web; the already-running API still needs a restart to load the updated `.env`. Details are logged in `User_Swaym-Yatri/document.md`.

## Swayam Yatri Development Phone Sign-In
- **Completed:** Added CSRF-protected, console-delivered OTP login and signed-cookie sessions to the isolated Django backend, plus a Next.js login page and Expo login modal. The OTP is never returned by the API; no SMS provider or API key is used. Guests can still browse transit data.
- **Safety boundary:** OTP delivery is available only in `DEBUG=True`; this is a demo identity, not production authentication. Local `Backend/.env` now has a generated secret key; never copy it into tracked files or documentation.
- **Cookie invariant:** Browser API requests must use the page's local/private hostname so Django `SameSite=Lax` CSRF/session cookies are same-site. Expo native retains its configured LAN API host; do not weaken cookie policy to `SameSite=None` for local HTTP.
- **Validation:** Next.js lint/build, Expo web/Android exports, and 23 Django tests passed. Expo browser CSRF flow reached serializer validation (`400`) rather than CSRF rejection (`403`).
- **Details:** `User_Swaym-Yatri/document.md`.

## Swayam Yatri Interactive Route Timeline
- **Completed:** Web and Expo now show a vertical, clickable route timeline limited to the selected origin-to-destination segment. Selecting a stop updates the boarding stop and ETA; earlier and later route stops are excluded.
- **Data boundary:** Public route detail contains stop sequence and distance, but no scheduled times/platforms. Do not fabricate these fields for the UI.
- **Validation:** Next.js lint/build and Expo web/Android exports passed. Browser verification confirmed the Malkapur-to-Nashik segment shows all four included stops and that selecting Bhusawal updates boarding state.
- **Details:** `User_Swaym-Yatri/document.md`.

## Swayam Yatri Boarding-Stop Arrival Status
- **Completed:** Web and Expo classify buses as approaching, at, or departed from the selected boarding stop. Before the stop, the ETA targets boarding; after it, the ETA targets the destination. The route timeline also shows a clock-time estimate for every upcoming stop, with past/current stops clearly marked. Per-stop estimates use the public ETA endpoint and refresh with bus polling.
- **Data boundary:** Times are approximate estimates derived from reported position and speed using demo fixtures, not live GPS or an official timetable. Stop dwell times are unavailable; keep demo notices and never present these estimates as scheduled arrivals.
- **Validation:** Browser checks on route 102 showed upcoming ETAs for all stops in both Next.js and Expo; choosing the bus at Bhusawal marked earlier stops passed, current stop as here, and retained future ETAs. Next.js lint/build and Expo web/Android exports passed.
- **Details:** `User_Swaym-Yatri/document.md`.

## Swayam Yatri Pre-Origin Bus Visibility
- **Completed:** When the selected bus is upstream of the chosen origin, the web and Expo timelines extend back to its current route stop, while keeping the selected origin/destination markers. The live-bus API already includes route buses before the origin until they pass the destination.
- **Display:** Stops before the selected source show distance as `km before source`; the current stop is marked and upcoming stop ETAs remain available.
- **Validation:** Browser verification on route 104 from Bhusawal to Jalgaon showed the Malkapur bus in the bus list and timeline, with Malkapur marked as current and the source/destination still visible. Next.js lint/build and Expo web/Android exports passed.
- **Details:** `User_Swaym-Yatri/document.md`.

## Security Review — 2026-11-27
- **Findings:** The read-only review identified missing authorization on main Django operational/admin endpoints, unauthenticated Express telemetry ingestion, and HTTP transport for ETM LAN requests carrying JWTs. It also confirmed the main conductor login accepts an employee ID alone; deployment defaults need explicit verification.
- **No actionable findings:** The reviewed isolated Swayam Yatri OTP/CSRF/CORS/session/public API and web/Expo clients, and the reviewed dependency manifests.
- **Status:** Findings and evidence are recorded in `testing.md`. No security remediation was performed in this documentation task; do not expose affected services to untrusted networks.
