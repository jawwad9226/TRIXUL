# TRIXUL Master Execution Log

This is the high-level, master tracking document for the entire TRIXUL platform. It tracks macro milestones across all stages and serves as the single source of truth for project-wide progress.

---

## Stage 1 & 2: The ETM Node & Central Brain (Feature Status: Complete; Security Work Open)
The foundational data generator and database orchestrator.

- [x] Lock in Django, PostgreSQL, and PostGIS 9-table schema.
- [x] Build rugged ETM React Native UI with thumb-steppers (eliminating manual text input).
- [x] Integrate automated concession fare logic (Mahila Sanman Yojana, Senior Citizens).
- [x] Implement 10-second GPS telemetry heartbeat via HTTP POST.
- [x] Connect live PostgreSQL ticket logging and end-of-shift reconciliation (Cash vs. UPI).
- [x] Implement Batch Ingestion API (`/api/v1/sync/batch/`) for ETMs emerging from offline rural dead zones.
- [x] Build Depot Shift Closure endpoint (`POST /api/v1/admin/shifts/<id>/close/`) to calculate total shift collections automatically.
- [x] Refine the ETM "Slide to SOS" gesture to prevent accidental panic triggers on bumpy roads.
- [x] Wire automated connectivity detection to fully automate the ETM's Offline/Online UI badge.

---

## Stage 3: Admin Command Center (Feature Status: Complete; Security Work Open)
The web-based operational hub for fleet management.

- [x] Scaffold React 18 Admin Dashboard and connect to Django APIs.
- [x] Build Live Fleet Radar using CartoDB Dark Matter tiles.
- [x] Build Depot Revenue Dashboard tracking live Cash/UPI splits.
- [x] Add a visual 45-passenger red-line threshold on Recharts bar graphs for instant route saturation cues.
- [x] Add 1-Click Short-Trip Deployment UI (Demand Surge Card) for the depot manager.
- [x] Synchronize Fleet Radar telemetry with ETM 10-second heartbeat cadence (HTTP polling).
- [x] Implement Incident State Machine (add an "Acknowledge/Resolve" API to silence flashing SOS UI alerts).
- [x] Build Mid-Shift Reassignment protocol to dynamically swap buses during highway breakdowns without losing shift data.
- [x] Implement Dynamic Fare Control toggles (pushing a 10% midday discount to all active ETMs).

---

## Stage 4A: Swayam Yatri Commuter Prototype (In Progress)
The current web and Expo clients are read-only for transit data and use a separate static-demo backend. This is not a live operational passenger service.

- [x] Build Next.js web and Expo clients with route search and responsive commuter dashboard.
- [x] Show ordered route stops, selected bus position, demo fare, and approximate ETA.
- [x] Add a stop-by-stop timeline with boarding-stop status, clock-time estimates, and visibility of buses approaching from upstream.
- [x] Add development-only phone OTP sign-in; guest browsing remains available.
- [ ] Replace static fixtures with verified public schedules, fares, and current telemetry before live use.
- [ ] Implement a geographic map and crowd-sense only when supported by real route geometry and current occupancy data.
- [ ] Security-gate any non-local deployment and verify production authentication, authorization, TLS, and configuration.

QR ticketing, payments, Lost & Found, and recommendations are out of scope for Stage 4A.

---

## Security Review — 2026-11-27

- [x] Read-only review of the main Django API, Express telemetry service, Admin/ETM API handling, and isolated Swayam Yatri OTP/API/client flows.
- [x] Document findings in [`testing.md`](./testing.md), including exact evidence and review limitations.
- [ ] Remediate missing Django API authorization, unauthenticated Express telemetry, and ETM HTTP transport for LAN use.
- [ ] Replace ID-only conductor token issuance and verify production Django settings before deployment.
- [ ] Re-run security review and targeted tests after remediation.

The review found no actionable issue in the isolated Swayam Yatri OTP flow or reviewed dependency manifests. No security fixes were made during this documentation update.

---

## Stage 5: AI & Predictive Optimization (The Data Science Layer)
The intelligence layer training on PostgreSQL ticket and telemetry logs.

- [ ] Train Demand Forecasting models (e.g., XGBoost, Pandas) to predict specific route overflows 24–48 hours in advance.
- [ ] Implement Origin-Destination (O/D) Matrix Reconstruction algorithms to mathematically infer passenger alighting patterns from fare-box data.
- [ ] Upgrade standard ETAs to Deep Sequence Modeling (LSTMs) for traffic-aware, highly precise arrival predictions during congestion.
- [ ] Build algorithmic bottleneck detection to suggest automated timetable adjustments.
- [ ] Integrate Predictive Vehicle Maintenance models using ETM vibration and speed anomaly telematics.

---

## Stage 6: Cloud Production & Hardware Integration
Moving from local development to real-world highway deployment.

- [ ] Migrate the Django and PostGIS database from localhost to a production cloud provider (AWS EC2 + RDS, or Render).
- [ ] Integrate Bluetooth ESC/POS protocol in the ETM app to support handheld thermal receipt printers.
- [ ] Integrate NFC/RFID tap-to-pay smart card scanners within the ETM interface.
- [ ] Deploy multi-tenant SaaS architecture schema partitioning to allow private operators and MSRTC to share the platform securely.

---

## Academic Publishing Track (Parallel Goal)
Filing research papers to scientifically validate the TRIXUL engineering.

- [ ] Finalize the selection of 4 master research topics (2 for AI/Data, 2 for Systems/Security) with the project guide.
- [ ] Complete literature reviews (10-15 base papers) for the chosen domains.
- [ ] Extract empirical proof (Django API latencies, PostGIS query speeds, simulated LSTM accuracy) directly from the TRIXUL codebase.
- [ ] Draft and format findings into 6-page IEEE/Springer standard papers for 8th Semester submission.
