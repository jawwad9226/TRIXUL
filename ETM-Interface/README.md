# TRIXUL ETM Interface — Smart Conductor Electronic Ticket Machine

The rugged, offline-capable mobile interface built for state transit bus conductors. Replaces legacy mechanical ticket punchers and bulky thermal boxes with a unified Android/Web application powering rapid fare issuance, automated government concession deductions, 10-second GPS telemetry heartbeats, anti-bumping SOS emergency triggers, and end-of-shift cash/UPI reconciliation.

---

## 📱 Features & Highlights

- **Thumb-Stepper Rapid Ticketing:** Zero manual text input on moving buses. Rapid `+ / −` steppers for Adult Male, Women (50% Mahila Sanman Yojana), Senior Citizens (75+ Free Amrit Concession), and Children (50% Half-fare).
- **Smart 3-Chip Stop Selector:** Instant one-tap selection of `⏪ Prev`, `📍 GPS Current`, and `⏩ Next` stops derived dynamically from route sequence and live coordinates.
- **Offline-First Batch Sync:** When operating in rural cellular dead zones, tickets are generated locally and queued in encrypted storage. Upon reconnecting, tickets batch-sync atomically to PostgreSQL via `POST /api/v1/sync/batch/`.
- **Rugged "Slide to SOS" Emergency Gesture:** Replaces accidental button taps on rough highway terrain with a deliberate swipe-to-confirm gesture that broadcasts emergency alerts directly to depot dispatch.
- **Mid-Shift Bus Swap Detection:** Automatically picks up dynamic vehicle swaps triggered by depot controllers during roadside breakdowns without losing shift revenue or ticket logs.
- **Live Shift Financial Reconciliation:** Real-time cash in hand vs. digital UPI split reconciled directly against PostgreSQL database records for end-of-day depot checkout.
- **Fleet Inter-Visibility & Advisories:** Conductors can monitor live running statuses of other buses on the corridor and receive broadcasted road warnings and accident alerts.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React Native (Expo SDK 54) |
| **State Management** | Redux Toolkit (`conductor`, `route`, `ticket`, `alerts`, `bus`, `updates`) |
| **Storage** | `@react-native-async-storage/async-storage` & `expo-secure-store` |
| **Geospatial & GPS** | `expo-location` (High-accuracy Balanced GPS) |
| **Network Client** | Axios with automatic JWT interceptors & offline fallback |
| **UI Components** | React Native Gesture Handler, Linear Gradient, Material Community Icons |

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **yarn**
- **Expo Go** app on Android/iOS (if running on physical hardware)
- **Running Backend**: Django API server running at `http://localhost:8000` (or local LAN IP)

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
cd ETM-Interface
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `ETM-Interface/` directory:

```env
# For Web Browser testing:
EXPO_PUBLIC_API_URL=http://localhost:8000

# For Android Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:8000

# For Physical Phone testing (Same Wi-Fi network):
# EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000
```

### 3. Launch the Application

```bash
# Run in Web Browser
npm run web

# Run on Android Emulator / Physical Device
npm run android

# Run on iOS Simulator
npm run ios
```

---

## 📂 Source Code Structure

```text
ETM-Interface/src/
├── components/          # Reusable UI primitives (MetricPill, AppCard, StatusBadge, TicketTile)
├── constants/           # Color palettes, typography, spacing tokens
├── navigation/          # React Navigation Root Stack & Tab configurations
├── screens/
│   ├── InitializerScreen.js     # Conductor auth, shift auto-binding, and route sync
│   ├── SplashScreen.js          # Boot splash & local session restoration
│   ├── DashboardScreen.js       # Live occupancy, next stop, telemetry sync, offline badge
│   ├── TicketBookingScreen.js   # 1-handed ticketing, Yojana concessions, cash/UPI pay
│   ├── TicketHistoryScreen.js   # Live cash vs. UPI reconciliation & slip reprinting
│   ├── BusStatusScreen.js       # Station progress timeline, speed, and PostGIS ETA
│   ├── EmergencyAlertScreen.js  # "Slide to SOS" anti-bump emergency dispatcher
│   ├── OtherBusRoutesScreen.js  # Live fleet corridor visibility
│   └── UpdatesScreen.js         # Active road hazard warnings & dispatch notices
├── services/
│   ├── api.js                   # Axios client, heartbeat, batch sync, shift summary
│   └── storage.js               # AsyncStorage wrapper & offline queue management
├── store/
│   ├── index.js                 # Central Redux store
│   └── slices/                  # Slices: conductor, route, ticket, bus, alerts, updates
└── utils/
    ├── fare.js                  # Dynamic fare calculation & government scheme logic
    └── format.js                # Currency & timestamp formatters
```

---

## 📡 Backend API Endpoints Consumed

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/v1/auth/login/` | `POST` | Authenticate conductor and return assigned active shift |
| `/api/v1/routes/<id>/` | `GET` | Initialize route sequence, PostGIS stops, and fare matrix |
| `/api/v1/telemetry/heartbeat/` | `POST` | 10-second GPS telemetry ping with PostGIS ETA & bus sync |
| `/api/v1/ticketing/issue/` | `POST` | Issue real-time ticket directly to PostgreSQL |
| `/api/v1/sync/batch/` | `POST` | Atomically batch-ingest queued offline tickets |
| `/api/v1/ticketing/shift/<id>/summary/` | `GET` | Retrieve live shift reconciliation and tickets from PostgreSQL |
| `/api/v1/admin/incidents/` | `POST` / `GET` | Broadcast SOS / Retrieve active highway advisories |
| `/api/v1/admin/fleet/` | `GET` | View other buses currently operating across the network |
