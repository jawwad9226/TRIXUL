# Swayam Yatri — Project Documentation

## Project overview

Swayam Yatri is a mobile-first public commuter app prototype. The browser frontend is **Next.js**, which is a React framework; the UI components are written with React. It lives at this folder's root and uses the Next.js App Router. A separate **Expo / React Native** client for Android and Expo Go lives in `Expo-App/`. Both clients use the isolated Django API and demo data inside `Backend/`.

All Swayam Yatri app code, configuration, and documentation are kept within this folder. The isolated backend does not connect to or modify the main TRIXUL backend.

The current prototype focuses on:

- Guest access to a bus-route dashboard.
- Searching routes by origin and destination stops.
- Viewing ordered route stops, demo fare calculations, bus positions, and estimated arrival times.
- Android-friendly responsive layout with larger touch controls, safe-area spacing, and a mobile bottom navigation bar.
- A separate Expo Go client with route search, stop-line bus positions, 10-second bus refresh, boarding-stop ETA, and demo fare display.

This is a demo environment, not a production transit service. Route and bus information are mock data. Places, public services, and city announcements remain coming-soon sections.

## Change inventory

| Area                     | Changes                                                                                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js app              | Root-level Next.js App Router pages for welcome (`/`) and transit dashboard (`/dashboard`).                                                                                                                                                               |
| Route and bus discovery  | Route search reports demo bus counts. Select a route to see example bus positions, speed, illustrative ETA, and demo fare; the UI labels fixture data as demo rather than live service.                                                                |
| Stop progress display    | Replaced geographic maps in both clients with a simple horizontal route line. Each point is a stop; selecting a bus places its bus marker on the API-provided current stop.                                                                              |
| Journey-aware bus filter | Selecting a source and destination shows the route through the destination only. Stops before the source remain visible to locate approaching buses; buses currently beyond the destination are excluded from recommendations and route bus counts. |
| Expo Android app         | `Expo-App/` is a standalone React Native client for Expo Go; it shares the public API and mirrors the website dashboard's branding, content hierarchy, initial route selection, route/bus cards, progress line, fare/ETA panels, discovery cards, and navigation while using native controls. Source and destination are visible native picker buttons that open a full stop list. |
| Android usability        | Mobile viewport metadata, safe-area padding, touch-sized form controls, responsive route progress and bus cards, sticky dashboard header, and fixed bottom navigation on narrow screens.                                                                 |
| Frontend API integration | Next.js uses `NEXT_PUBLIC_API_BASE_URL`; Expo uses `EXPO_PUBLIC_API_BASE_URL`. Both call the same public API. Leaflet and native map packages were removed because neither client uses a geographic map.                                                 |
| Transit API              | Public route search/detail, stop search, live-list-shaped demo bus data, and bus ETA endpoints under `/api/v1/public/`.                                                                                                                                  |
| Demo data                | Static stops, routes, fare rules, and buses in `Backend/transit/mock_data.py`; no database seed or migration step.                                                                                                                                        |
| Authentication           | Sign-in is not included; both clients are browse-only.                                                                                                                                                                                                      |
| Backend simplification   | Removed the PostgreSQL/PostGIS driver requirement, ORM transit models/migrations, and database-based seed commands. Django uses an ephemeral in-memory SQLite connection only for framework/test-runner compatibility; app records are not stored there. |
| Documentation            | This file describes features, endpoints, setup, Android use, limitations, and validation. [`test_data.md`](./test_data.md) lists route, stop, fare, bus fixtures, and public API examples.                                                                     |

### Main files

- `app/`: Next.js App Router pages and global styling.
- `components/TransitDashboard.jsx`: transit search, route/bus display, and mobile navigation.
- `components/RouteProgress.jsx`: simple stop-by-stop line with the selected bus shown at its current stop.
- `lib/api.js`: shared public API GET client.
- `Expo-App/App.js`: native route search, stop-line bus position, and bus ETA.
- `Expo-App/.env.example`: Expo API base URL template; use the computer's LAN IP when testing on a phone.
- `Backend/transit/mock_data.py`: editable mock transit records.
- `Backend/transit/services.py`: route, fare, bus-list, and Haversine ETA logic over mock data.
- `Backend/transit/views.py` and `Backend/transit/urls.py`: public API views and routes.
- `Backend/trixul_public_backend/settings.py`: isolated Django and CORS configuration.
- `test_data.md`: detailed test fixture reference.

## Frontend

The browser frontend is **Next.js + React** (not a standalone React/Vite project). It uses Next.js 15 and React 18 with the App Router. The Expo frontend is a separate React Native implementation because native Expo components are not interchangeable with browser DOM components. Both now follow the same dashboard layout, visual palette, content sections, and journey behavior; controls adapt to each platform (native horizontal stop selectors in Expo, HTML selectors on the web). The route display is a simple stop line, not a geographic map.

| Page         | Purpose                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `/`          | Welcome page with direct guest exploration.                                                     |
| `/dashboard` | Route search, demo bus list and stop-line position, ETA/fare details, and future-feature cards. |

The dashboard requests bus data every 10 seconds. With a destination selected, the API only returns buses currently at or before that destination in route order. The route line keeps earlier stops (including stops before the source) so an approaching bus can still be located, and ends at the destination. Those requests return static demo current-stop positions; the refresh interval and response timestamps do **not** make the fixture real-time telemetry.

## Isolated public API

All app API routes are under `/api/v1/public/`. Response keys use `snake_case`.

| Method | Endpoint                               | Parameters/body                              | Purpose                                                                                                       |
| ------ | -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/public/routes/`               | `q`, `origin_stop_id`, `destination_stop_id` | Searches mock route summaries. Origin/destination must be supplied together and must appear in forward order. With a destination, `active_bus_count` excludes buses already past it. |
| GET    | `/api/v1/public/routes/{route_id}/`    | —                                            | Returns mock route stops, fare rule, and calculated stop-pair fares.                                          |
| GET    | `/api/v1/public/stops/`                | `q`                                          | Lists/searches mock stops and coordinates.                                                                    |
| GET    | `/api/v1/public/buses/live/`            | `route_id`, optional `destination_stop_id`    | Returns route buses at or before the destination; buses beyond it are omitted.                             |
| GET    | `/api/v1/public/buses/{bus_id}/eta/`   | `stop_id` (required)                         | Calculates Haversine distance and demo ETA for a stop on the bus's mock route.                                |

Route summaries include `active_bus_count`. Each live-bus response includes `current_stop_id` and `current_stop_name`; these fields place the selected bus on the stop line in both apps. The source stop is marked on the line, all prior stops remain visible for buses behind the source, and the line does not show stops after the chosen destination.

The API does not mount source admin, authentication, ticket booking, ticket synchronization, shift management, telemetry ingestion, incidents, or revenue endpoints.

## Mock data and test fixtures

The backend uses in-code fixtures in `Backend/transit/mock_data.py`; it has no persistent application database. Edit that file to change the demo records. Runtime edits are not saved and return to the checked-in values when the file is restored/reloaded.

Fixture collections:

- `STOPS`: stop IDs, names, and coordinates.
- `ROUTES`: route IDs/names, ordered stops/distances, and fare rules.
- `BUSES`: registration numbers, assigned routes, static positions, and speeds.

The mock dataset does not include scheduled departure times, actual GPS updates, occupancy counts, concession calculations, or a zero-speed/stale-bus fixture. Current bus stops, fares, speeds, and ETAs are illustrative, not official or live. Multiple mock buses and shared-stop route connections are provided for route search and bus selection testing. For exact values and ready-to-run API examples, see [`test_data.md`](./test_data.md).

## Windows setup and execution

These PowerShell commands assume Python 3.12 and Node.js/npm are installed. PostgreSQL, PostGIS, GDAL, and database migrations are not required. Replace the example project path if this folder is located elsewhere. Run each server in its own terminal and leave those terminals open.

### A. One-time backend setup

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri\Backend'
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Set a unique local-only `SECRET_KEY`; generate one by running this command in the activated backend terminal and copy the output into `.env`:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Do not overwrite an existing `.env`; it may contain local settings. The template's initial `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` are for a computer-only run. For physical Android testing, update these values as described in section D.

### B. Start the Django API (computer-only)

In a backend terminal:

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri\Backend'
.\.venv\Scripts\Activate.ps1
python manage.py check
python manage.py runserver 127.0.0.1:8000
```

Leave it running. To enable Android-device access instead, use `python manage.py runserver 0.0.0.0:8000` as shown in section D.

### C. Start the Next.js website

In a second terminal:

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri'
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
```

Confirm `.env.local` contains the correct API URL:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Use `localhost` when opening the website on this computer. The checked-in `.env.example` and local `.env.local` use this same-computer setting. Then start the website:

```powershell
npm run dev
```

Open `http://localhost:3000`. The app uses React Strict Mode in development. The former Leaflet map was removed from both clients and replaced by a route-stop line; no native or browser map service/key is required.

### D. Run the website or Expo app on Android over Wi-Fi

This is for local testing on a trusted private network. The computer and phone must be on the same Wi-Fi. Install **Expo Go** on Android. Find the computer's current Wi-Fi IPv4 address in `ipconfig` (or run the PowerShell command below). Do not reuse an old address: it can change when the computer joins another network.

```powershell
Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' |
  Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -First 1 -ExpandProperty IPAddress
```

1. Edit `Backend\.env`, keeping its current values and adding the computer's LAN address/origin:

```dotenv
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.23
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.23:3000
```

Replace `192.168.1.23` in those examples with the current Wi-Fi address. Preserve other allowed entries, save `.env`, and restart Django; a running Django process does not reload this file.

2. Set the root `.env.local` API URL to that same current address only if you plan to open the Next.js website on the phone:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.23:8000
```

If you only use the browser on the computer, keep `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`; this avoids depending on a changing LAN address. Restart Next.js after changing `.env.local`.

3. Configure Expo's API URL. Open a new PowerShell terminal:

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri\Expo-App'
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Set the value to the computer's actual LAN IP:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.23:8000
```

Replace the example IP with the current Wi-Fi IPv4 address. The Expo API URL must exactly match the current computer address. A stale IP makes requests fail and prevents the stop picker from loading its choices.

4. Start Django, bound to the network interface, in its own terminal:

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri\Backend'
.\.venv\Scripts\Activate.ps1
python manage.py check
python manage.py runserver 0.0.0.0:8000
```

5. To open the website in Android Chrome, start Next.js from the project root (restart it after changing `.env.local`):

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri'
npm run dev -- --hostname 0.0.0.0
```

Open `http://192.168.1.23:3000` in Android Chrome.

6. To open the native app in Expo Go, start Metro in another terminal. If Expo is already running, press `Ctrl+C` in its terminal after editing `.env`. Then start Metro with its cache cleared so it does not reuse an old API URL. Install dependencies only if they have not already been installed:

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri\Expo-App'
npm install
npx expo start --lan --clear
```

Expo displays its own QR code. Scan it using **Expo Go** (not the Android camera browser link) to launch the native app. If Expo shows a previously opened project, close it and scan the new QR code from the restarted Metro server. On the phone, `localhost` means the phone itself, so always use the computer's LAN IP for the API.

7. Test network reachability from Android Chrome before opening the app: visit `http://<CURRENT_WIFI_IP>:8000/api/v1/public/stops/`. The endpoint should return JSON. If it does not, confirm both devices are on the same Wi-Fi, Django was restarted with the current IP in `ALLOWED_HOSTS`, and Windows Firewall allows Python on the trusted private network.

If Windows Firewall prompts, allow Node.js/Python only on a trusted private network. The phone must be able to reach the API at the current Wi-Fi address. If LAN discovery is blocked, Expo tunnel mode may be used for Metro, but the Django API must still be reachable by the phone. This setup requires the computer, API server, and (for Expo Go) Metro bundler to remain running.

The Next.js website and Expo client are separate: Android Chrome opens the website URL; Expo Go scans the Expo QR. Both display local mock bus data. A 10-second refresh does not represent live vehicle telemetry.

### Browser cannot reach the API

- On the same computer, open the site at `http://localhost:3000` and use `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`. The backend must be running; test it directly at `http://localhost:8000/api/v1/public/routes/`.
- For Android Chrome, use the computer's current Wi-Fi IPv4 address for both the website and API. Add the website origin to `CORS_ALLOWED_ORIGINS` and the API host to `ALLOWED_HOSTS`, then restart Django and Next.js.
- A `Failed to fetch` message can mean the API host is unreachable or the browser origin is not in Django's CORS allowlist. Check the browser console's request URL and `Origin`, and ensure the URL does not use a stale LAN IP.
- The API root `/` is not a user interface. Test the public route endpoint above or use the Next.js website.

### Browser hydration warning

If Next.js reports that the `<html>` element has an unexpected `data-qb-installed` attribute, test in a private window or disable the browser extension that injects it (often QuickBooks-related). That attribute is not rendered by this app. If the warning remains in a clean browser, investigate the new mismatch rather than suppressing it.

## Validation commands

From the project root, with the backend and website dependencies installed:

```powershell
npm run lint
npm run build
```

For the Expo client:

```powershell
Set-Location 'E:\CODES\PublicRepo\Trixual\User_Swaym-Yatri\Expo-App'
npx expo-doctor
npx expo export --platform android
```

From the backend folder, with its virtual environment activated and a development `SECRET_KEY` configured:

```powershell
python manage.py check
python manage.py test transit.tests
```

The backend tests use Django's test runner and in-code mock fixtures; no service database is needed. The configured SQLite database is ephemeral and is not used to store route or bus records.

## Out of scope and safety notes

- There are no real live bus feeds, schedules, ticket booking, payments, occupancy/crowd-sense data, or commuter benefit verification.
- Places, public services, and city announcements are placeholders.
- API bus coordinates and fare rules are mock fixtures; do not present them as official or real-time data.
- The backend is a local demo; its development configuration is not suitable for production.
- Do not add passwords, API keys, or other secrets to the fixture/documentation files.
- The original TRIXUL backend remains separate and unchanged by this isolated Swayam Yatri app.

## Work log — 2026-11-25 (Asia/Kolkata)

This log records today's Swayam Yatri work, decisions, and validation.

### Starting context and inspection

- Continued in `User_Swaym-Yatri/` after completing the repository audit recorded in the root [`testing.md`](../testing.md). The repository already had staged/unstaged and untracked changes; those were treated as pre-existing and preserved.
- Read the applicable workflow, architecture, and context-memory rules in `.agent/rules/01-system-workflow.md`, `.agent/rules/02-architecture-stack.md`, and `.agent/rules/03-context-memory.md`, plus the root `MEMORY.md`.
- Read this project document, both commuter dashboards, the public API service/serializer/tests, and project package scripts before selecting work.
- Confirmed the commuter API uses static fixtures (`data_source: "demo"`), not live vehicles or scheduled timetable data. The frontends already included demo notices, but still called fixture records “live buses,” showed polling time as an update time, and said a timetable was being shown when no timetable endpoint/data exists.

### Scope and decisions

- Chose a small, user-facing accuracy fix instead of introducing live API integrations or changing schemas/authentication without a specified data provider.
- Updated both clients to call demo bus records “examples,” distinguish a client-side data check from a vehicle location update, call fixture ETAs illustrative, and avoid claiming that a timetable is available.
- Kept the API, route/fare calculation, refresh cadence, and existing demo warnings unchanged. This work does not make the mock fixture data live or production-ready.

### Files changed

- `components/TransitDashboard.jsx`: data-source-aware labels for bus counts, example positions, ETA, empty state, and last-check status.
- `Expo-App/App.js`: matching wording for the Expo client, including checked-at time, demo bus examples, and illustrative ETA.
- `document.md`: updated the change inventory and added this dated work log.
- Root `MEMORY.md`: appended the current Swayam Yatri status and remaining live-data limitation.

### Commands and validation

- Inspected current worktree state with `git status --short` before editing; the repository already contained staged/unstaged changes, and none were reverted.
- Confirmed root and Expo dependencies were already present; no installation or dependency manifest changes were needed.
- `npm run lint` from `User_Swaym-Yatri/`: passed.
- `npx expo export --platform android --output-dir C:\Users\harsh\AppData\Local\Temp\Trixual-SwayamYatri-android-20261125` from `Expo-App/`: passed; Android bundle included 591 modules. The temporary export directory was removed after success.
- `.\.venv\Scripts\python.exe manage.py test transit.tests` from `Backend/`: passed, 14 tests.
- `.\.venv\Scripts\python.exe manage.py check` from `Backend/`: passed, no issues.
- Checked the edited components and documentation for unresolved Git conflict markers; none were found.
- Did not run `npm run build`: it would rewrite the pre-existing `.next` build cache.
- No files were staged or committed.
- No database writes, external API requests, dependency installation, or main-backend changes were made.

### Remaining limitations

- Bus positions, fares, speed, and ETA remain illustrative mock fixtures. No live telemetry, schedule, crowd-sense, or map integration was added.
- Backend fixture responses still generate request-time `last_updated_at` values; the UI now labels client refresh time as a data check, but API freshness metadata should be corrected separately before adding a real live-data source.
