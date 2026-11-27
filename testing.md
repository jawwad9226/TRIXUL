# TRIXUL Security Review and Test Report

## Overview

This report records the read-only security review completed on 2026-11-27 and preserves an earlier full-repository baseline audit. The latest review covered the main Django backend, Express telemetry service, Admin and ETM client API handling, and the isolated Swayam Yatri OTP/API/client flows. Findings from the earlier audit are retained below as historical until revalidated.

No application code was changed as part of this review. Deployment reachability and runtime exploitability were not tested.

## Latest Security Review — 2026-11-27

The review identified three actionable vulnerabilities across the reviewed code and two confirmed concerns outside the changed lines. The reviewer found no actionable issue in the isolated Swayam Yatri OTP/CSRF/CORS/session/public API and clients, and no actionable dependency supply-chain issue in the reviewed manifests and lockfiles. No Admin Dashboard-specific client vulnerability was confirmed.

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🔴 CRITICAL | `Backend/core/serializers.py` | 13-21 | Conductor login accepts an employee ID alone and issues JWTs, enabling impersonation when an ID is known or guessed. This was confirmed as a repository concern outside the changed lines. | Not scored by reviewer |
| 2 | 🟠 HIGH | `Backend/core/views.py`; `Backend/core/urls.py` | `views.py:57-89, 111-162, 216-274`; `urls.py:19-37` | Operational and admin APIs lack authentication and authorization. A network-reachable caller can read fleet/revenue data and create or alter operational records. | 9/10 |
| 3 | 🟠 HIGH | `Backend/core/settings.py` | 13-23 | Fallback secret, `DEBUG=True`, wildcard hosts, and permissive CORS are unsafe defaults if active. The reviewer could not establish whether these defaults are active in deployment. | Code confirmed; deployment exposure unverified |
| 4 | 🟡 MEDIUM | `Backend/index.js` | 51, 382-415 | Express telemetry accepts unauthenticated caller-selected bus IDs and coordinates, allowing a network-reachable caller to spoof displayed positions. The server binds to `0.0.0.0` by default. | 9/10 |
| 5 | 🟡 MEDIUM | `ETM-Interface/scripts/update-env.js`; `ETM-Interface/src/services/api.js` | `update-env.js:22-23`; `api.js:46-48, 78-83` | ETM LAN configuration uses HTTP while transmitting/storing JWTs. An attacker on an untrusted LAN could observe or modify traffic and capture bearer tokens. | 8/10 |

For findings 2 and 5, the latest reviewer did not provide a numeric severity/confidence score; the severity labels reflect the prior baseline assessment where available. Finding 5 is conditional on deployment configuration. These findings have not been remediated in this documentation-only task.

## Historical Baseline Audit — Status Not Revalidated

The following full-repository audit predates the latest review. Its evidence and recommendations are retained for traceability, but its findings and validation results were not rechecked during the 2026-11-27 review.

**Historical overall risk: CRITICAL.** The prior audit reported unauthenticated administrative operations, ID-only employee token issuance, unsafe settings, an unauthenticated telemetry server, and additional ETM and commuter-platform concerns.

| Severity | Count |
|---|---:|
| Critical | 2 |
| High | 7 |
| Medium | 3 |
| Low | 0 |

## Previous Baseline Findings

### F-01 — Critical: Administrative API has no authentication or authorization

- **Location:** [`Backend/core/views.py`](./Backend/core/views.py), lines 108–268; routes in [`Backend/core/urls.py`](./Backend/core/urls.py)
- **Evidence:** Administrative API views explicitly set `authentication_classes = []` and `permission_classes = []`. This includes shift creation/closure and bus reassignment, incident acknowledgement, route/stop creation, and fare-control updates. The same configuration applies to fleet, dispatch, shift, revenue, and incident reads.
- **Impact:** Any network-reachable caller can modify dispatch assignments, close shifts, create routes/stops, change fares, acknowledge incidents, or retrieve administrative information without credentials. This is direct operational and financial integrity exposure.
- **Recommendation:** Require authenticated staff identities on every admin route and enforce role-based permissions on each operation. Default-deny permissions globally; explicitly grant `AllowAny` only to the intended public read-only endpoints.
- **Validation:** Confirmed by source inspection. No live endpoint requests were made.

### F-02 — Critical: Employee login accepts an ID alone and mints JWTs

- **Location:** [`Backend/core/serializers.py`](./Backend/core/serializers.py), lines 5–44; [`Backend/core/views.py`](./Backend/core/views.py), lines 38–47; demo IDs in [`Backend/core/management/commands/seed_trixul.py`](./Backend/core/management/commands/seed_trixul.py), lines 11–23
- **Evidence:** The login serializer accepts `emp_id`, `employee_id`, or `username`, performs an employee lookup, and creates access and refresh tokens without verifying a password, PIN, or other credential. The view disables authentication and permissions.
- **Impact:** Anyone who knows or guesses an employee ID can obtain a bearer token in that employee's identity. This enables impersonation on endpoints that do require JWT authentication and removes any meaningful identity verification.
- **Recommendation:** Replace ID-only login with a verified credential flow (for example, managed password authentication or a properly implemented short-lived OTP flow), add throttling and audit logging, and enforce role/ownership checks in addition to authentication.
- **Validation:** Confirmed by source inspection. Authentication was not exercised against a running server.

### F-03 — High: Ticket and telemetry operations trust caller-supplied shift IDs

- **Location:** [`Backend/core/services.py`](./Backend/core/services.py), lines 133–146 and 202–216; serializers in [`Backend/core/serializers.py`](./Backend/core/serializers.py), lines 50–66
- **Evidence:** Heartbeat and ticket services select a shift using the request's `shift_id`; if it is not found, they fall back to the first active shift. They do not compare the authenticated employee to the shift's conductor or require that the shift is active. Ticket validation also has no positive lower bound for passenger count or fare.
- **Impact:** Even after login is strengthened, a valid ETM identity may write telemetry or tickets against another shift by supplying its ID. Unknown shift IDs can silently redirect activity to an unrelated active shift, corrupting location, ridership, and revenue records.
- **Recommendation:** Derive the employee from the authenticated request, require an active shift owned by that employee, reject invalid/unknown shift IDs instead of falling back, and validate positive counts, amounts, coordinates, and route-consistent stop order.
- **Validation:** Confirmed by source inspection. No ticket or telemetry requests were submitted.

### F-04 — High: Unsafe production security defaults

- **Location:** [`Backend/core/settings.py`](./Backend/core/settings.py), lines 13–23
- **Evidence:** A predictable fallback `SECRET_KEY` is present; `DEBUG` defaults to `True`; `ALLOWED_HOSTS` is `['*']`; and `CORS_ALLOW_ALL_ORIGINS` is `True`.
- **Impact:** A production deployment missing one or more environment variables can run with debug diagnostics, an unsafe signing key, unrestricted host acceptance, and permissive cross-origin access. Debug responses can expose implementation details; a known signing key undermines trust in signed application data.
- **Recommendation:** Fail startup when a strong secret is absent; default `DEBUG` to false; require an explicit host allowlist; and configure CORS with approved origins only. Add a production configuration check that rejects unsafe combinations.
- **Validation:** Confirmed by source inspection. Production deployment configuration was not available for verification.

### F-05 — High: Express telemetry server is unauthenticated and accepts unbounded history writes

- **Location:** [`Backend/index.js`](./Backend/index.js), lines 43–51, 328–330, and 382–410
- **Evidence:** CORS defaults to `*`; the server binds to `0.0.0.0`; `POST /busLocation` accepts a caller-selected bus ID and coordinates without authentication; and every accepted packet is appended to the in-memory `liveTelemetryHistory` array without a retention limit.
- **Impact:** A network-reachable caller can spoof bus positions and fleet status. Repeated submissions can grow process memory without bound and degrade or terminate the service. The untrusted telemetry may be consumed as operational data.
- **Recommendation:** Do not expose this development/mock server as a production service. If retained, bind it to a restricted interface, require authenticated device credentials, validate coordinate/speed/timestamp ranges and assigned bus IDs, rate-limit writes, and persist telemetry with bounded retention.
- **Validation:** `node --check Backend/index.js` passed. No server was started and no requests were sent.

### F-06 — High: Unresolved merge-conflict markers block ETM parsing and backend dependency installation

- **Location:** [`Backend/requirements.txt`](./Backend/requirements.txt), lines 33–37; ETM files listed below
- **Evidence:** Conflict markers remain in `requirements.txt` and 11 ETM source files: `ETM-Interface/src/screens/BusStatusScreen.js`, `DashboardScreen.js`, `EmergencyAlertScreen.js`, `InitializerScreen.js`, `LocationScreen.js`, `OtherBusRoutesScreen.js`, `TicketBookingScreen.js`, `UpdatesScreen.js`, `ETM-Interface/src/store/slices/busSlice.js`, `ticketSlice.js`, and `ETM-Interface/src/utils/fare.js`. A Babel parser run over all 41 ETM source files reported syntax failures in all 11 affected files. Separately, `mockApi.js` and `busSlice.js` import `src/services/busTelemetry`, but no matching module exists in the source tree.
- **Impact:** The ETM cannot be reliably bundled or executed while these markers are present. The conflict markers in `requirements.txt` also make the dependency file invalid for normal installation.
- **Recommendation:** Resolve each conflict deliberately, then run the ETM build/lint and install-checks in a controlled environment. Do not select one side mechanically; the conflicting implementations include materially different authentication, payment, ticketing, emergency, and telemetry behavior.
- **Validation:** Read-only Babel parsing found 11 syntax failures. Python AST parsing found no Python syntax errors. No build or install was run.

### F-07 — High: ETM payment and ticket flows can report success without a real service

- **Location:** [`ETM-Interface/src/services/mockApi.js`](./ETM-Interface/src/services/mockApi.js), lines 141–149; [`ETM-Interface/src/store/slices/ticketSlice.js`](./ETM-Interface/src/store/slices/ticketSlice.js), lines 29–32 and 82
- **Evidence:** `verifyPayment` returns `"success"` for any positive amount and generates a synthetic reference. `submitTicketBooking` returns a success-shaped response without contacting a payment processor or ticketing backend. The ticket slice calls these mock functions.
- **Impact:** The UI can treat an unverified payment as paid and accept a locally generated ticket record as a successful booking. This creates a financial reconciliation and fraud risk if the app is used operationally.
- **Recommendation:** Remove these success-shaped mock operations from operational paths. Only mark an online payment successful after verifying a signed response from the payment provider; issue tickets through an authenticated, idempotent backend operation.
- **Validation:** Confirmed by source inspection. The ETM source currently has unresolved syntax conflicts, so runtime behavior was not tested.

### F-08 — High: Commuter endpoints return explicitly labeled demo buses and ETAs

- **Location:** [`User_Swaym-Yatri/Backend/transit/services.py`](./User_Swaym-Yatri/Backend/transit/services.py), lines 1–16 and 45–195; static fixtures in [`User_Swaym-Yatri/Backend/transit/mock_data.py`](./User_Swaym-Yatri/Backend/transit/mock_data.py)
- **Evidence:** Route, stop, bus, fare, and ETA services read from static `mock_data`. Live-bus responses set `last_updated_at` to the current request time and `is_stale` to false even though the fixture is static. ETA is calculated from fixed fixture coordinates and speeds. The API tests assert `data_source == "demo"`.
- **Impact:** The client can display fabricated vehicle positions and ETAs as newly updated live information. This can mislead commuters about whether a bus exists, where it is, and when it will arrive. It also conflicts with the stated requirement for PostGIS-backed live data and zero mock data.
- **Recommendation:** Connect these endpoints to validated production telemetry, schedule, route, and fare sources. Derive staleness from the actual telemetry timestamp; return an explicit unavailable/empty state when no current data exists. Keep demo fixtures isolated from production configuration.
- **Validation:** Confirmed by source inspection and existing test assertions. No API tests were run.

### F-09 — High: Unauthenticated endpoints expose ticket histories and operational/financial data

- **Location:** [`Backend/core/views.py`](./Backend/core/views.py), lines 78–101 and 108–168; [`Backend/core/services.py`](./Backend/core/services.py), lines 326–379 and 793–856
- **Evidence:** Batch ticket ingestion and shift summaries disable authentication and permissions. Shift summaries return ticket-level history, fares, payment modes, conductor IDs/names, bus and route details, and cash/UPI totals. Admin revenue and fleet endpoints are also unauthenticated.
- **Impact:** Anyone able to reach the API can read sensitive revenue and employee/shift information and may enumerate ticket records. This can expose operational and commercially sensitive data independently of the write-access issue in F-01.
- **Recommendation:** Require authentication and enforce per-shift ownership for ETM summaries; restrict fleet and revenue reporting to authorized admin roles; minimize exposed identifiers and ticket-level detail; paginate and audit access.
- **Validation:** Confirmed by source inspection. No endpoint data was retrieved.

### F-10 — Medium: Occupancy is computed from cumulative ticket counts, not current onboard passengers

- **Location:** [`Backend/core/services.py`](./Backend/core/services.py), lines 526–559 and 572–584
- **Evidence:** Fleet statistics label a sum of all tickets on a shift as `passengers_today` and use it for occupancy/capacity alerts, without subtracting passengers who have alighted. Route analytics sum tickets across all shifts for the route, with no date filter.
- **Impact:** Occupancy and surge indicators can exceed real onboard counts, remain inflated after a route completes, and trigger misleading capacity alerts. The route-level aggregate includes historical rides.
- **Recommendation:** Track current onboard counts using validated boarding/alighting events or a well-defined trip model. Apply explicit service-date and active-shift filters and distinguish cumulative boardings from current occupancy in API names and UI labels.
- **Validation:** Confirmed by source inspection. No database queries were run.

### F-11 — Medium: Backend ETA fabricates speed and location when live inputs are inadequate

- **Location:** [`Backend/core/services.py`](./Backend/core/services.py), lines 175–183; ETM fallbacks in [`ETM-Interface/src/screens/BusStatusScreen.js`](./ETM-Interface/src/screens/BusStatusScreen.js), lines 74–91
- **Evidence:** The ETA service substitutes `35 km/h` whenever reported speed is at most 10 km/h and uses hard-coded stop names and an 8-minute ETA if route stops are missing. The ETM screen also substitutes a default 8-minute ETA when the API response is absent.
- **Impact:** Stationary, missing, or invalid telemetry can yield a plausible but unsupported arrival estimate and location label rather than a clear unavailable/stale state.
- **Recommendation:** Calculate ETA only from fresh, validated telemetry and route geometry; return null/unavailable when the data cannot support a reliable estimate. Remove client-side ETA and stop-name success fallbacks.
- **Validation:** Confirmed by source inspection. No ETA runtime scenarios were executed.

### F-12 — Medium: Commuter MVP lacks requested live map, schedule, and crowd-sense capabilities

- **Location:** [`User_Swaym-Yatri/document.md`](./User_Swaym-Yatri/document.md), lines 29, 87, 149, and 267; [`User_Swaym-Yatri/Backend/transit/serializers.py`](./User_Swaym-Yatri/Backend/transit/serializers.py)
- **Evidence:** Project documentation states the geographic map was removed, that the demo dataset lacks scheduled departures and occupancy, and that there is no real live feed. The public response contracts contain route stops, fares, buses, and ETA fields but no scheduled departure or crowd/occupancy fields.
- **Impact:** The current commuter experience does not meet the requested Stage 4A feature scope and cannot provide a map, an official timetable, or a trustworthy current crowd indicator.
- **Recommendation:** Treat the present app as a clearly labeled prototype. Before production use, add real schedule and occupancy data contracts, implement a map using validated route geometry/telemetry, and only expose crowd indicators when backed by current passenger counts.
- **Validation:** Confirmed by documentation and API contract inspection. UI acceptance tests were not run.

## Previous Baseline Validation

| Check | Result | Notes |
|---|---|---|
| Read-only Babel parse of ETM `src` | **Failed** | 41 files parsed; 11 files contain syntax errors at unresolved conflict markers. |
| Read-only Python AST parse of main backend | **Passed** | 18 Python files parsed; no syntax errors found. |
| `node --check Backend/index.js` | **Passed** | Express server source parses as JavaScript. |
| Git tracking check for local `.env` files | **Passed** | Checked local files were not tracked. Contents were not displayed. |
| Test/build execution | **Not run** | Existing test scripts may write database state or build artifacts; ETM source is already syntactically invalid. |
| Dependency vulnerability audit | **Not run** | No network audit or dependency installation was performed. |

## Previous Baseline Unverified Areas

- Production deployment settings, reverse proxy, firewall, TLS, and whether the development Express server is reachable outside a trusted network.
- Database permissions, production data integrity, backups, retention, migrations, and PostGIS query behavior.
- Dependency CVEs and lockfile integrity; no package audit was performed.
- Runtime behavior and UI accessibility across browser, Android, and iOS.
- The main backend's existing endpoint test script was not run because it posts telemetry and creates ticket records.
- No penetration testing or live requests were performed.

## Previous Baseline Recommendations

1. **Immediately disable unauthenticated admin operations.** Add authentication and role-based authorization before exposing the API to any non-local network.
2. **Replace ID-only login and enforce shift ownership.** Reject arbitrary or missing shift IDs; never silently associate writes with the first active shift.
3. **Apply secure production settings.** Require a non-default secret, `DEBUG=False`, explicit hosts, and a narrow CORS origin list.
4. **Remove or isolate development/mock services.** Prevent mock payment success, static live bus data, and unauthenticated Express telemetry from being used in operational deployments.
5. **Resolve merge conflicts and restore a reproducible build.** Then run targeted backend tests and ETM/Admin/commuter builds in a disposable test environment.
6. **Correct business metrics and availability behavior.** Use current onboard passenger counts, reliable live telemetry freshness, and an unavailable ETA state when data is insufficient.
7. **Complete Stage 4A data and UI scope.** Implement real scheduled departures, map display, and crowd-sense data, or explicitly keep the commuter app labeled as a demo.

## Previous Baseline Risk Assessment

The prior audit concluded that the repository was **not safe for production deployment**. This latest review independently confirms unresolved access-control and transport concerns listed above. Do not expose the affected services to untrusted networks until the findings are remediated and deployment settings are verified.
