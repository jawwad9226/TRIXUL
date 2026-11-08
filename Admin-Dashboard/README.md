# TRIXUL Admin Command Center (Phase 3)

The high-density web command center for depot managers and fleet controllers to monitor live public transit telemetry, dispatch duty shifts, track real-time revenue reconciliation, and triage conductor emergency incidents.

---

## 🛠️ Architecture & Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (Dark Control Center Theme)
- **Mapping:** Leaflet + React-Leaflet with **CartoDB Dark Matter** tiles
- **Analytics:** Recharts (Route Occupancy with 45-passenger seated limit threshold)
- **Icons:** Lucide React
- **HTTP Client:** Axios (centralized client with JWT auth header interceptor)
- **Backend:** Django + PostgreSQL / PostGIS (10-second polling cadence)

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** (v9+) or **yarn** / **pnpm**
- **Running Backend**: Django server running at `http://localhost:8000`

---

## 🚀 Installation & Setup

1. **Navigate to the dashboard directory**:
   ```bash
   cd Admin-Dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Ensure the API URL points to the Django backend:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🖥️ Modular Component Structure

```text
Admin-Dashboard/src/
├── api/
│   ├── client.js           # Centralized Axios instance with JWT interceptor
│   └── admin.js            # Endpoints: fleet, shifts, dispatch-options, revenue, incidents, acknowledge
├── components/
│   ├── Layout.jsx          # Persistent shell: Revenue HUD, Cash/UPI split, Active Fleet counter, System Online status
│   ├── fleet/
│   │   ├── FleetMap.jsx    # CartoDB Dark Matter Leaflet map, pulsing markers & telemetry popups
│   │   └── BusCard.jsx     # Telemetry summary card
│   ├── Card.jsx
│   ├── PageHeader.jsx
│   └── StatusBadge.jsx
├── hooks/
│   ├── useFleetData.js     # 10s telemetry polling for fleet, KPIs, AI alerts, occupancy
│   ├── useIncidents.js     # 10s polling for conductor SOS and warnings
│   └── useRevenue.js       # Live cash vs UPI split and route/conductor breakdown
└── pages/
    ├── LiveDashboard.jsx   # Executive HUD: Mini Fleet Radar, Demand Surge Card (1-click deploy), 45-pax chart
    ├── FleetHUD.jsx        # Full-screen Leaflet radar with pulsing blue/red markers
    ├── ShiftDispatcher.jsx # Shift roster, Conductor + Bus + Route assignment, End Shift & Mid-Shift Bus Swap
    ├── RevenueDashboard.jsx# Cash vs UPI analytics, per-route earnings, conductor audit
    └── IncidentCenter.jsx  # Conductor SOS triage with Acknowledge/Resolve workflow (PATCH endpoint)
```

---

## 📡 Backend API Endpoints Consumed

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/v1/admin/fleet/` | `GET` | Live telemetry, vehicle positions, speed, occupancy, AI alerts |
| `/api/v1/admin/dispatch-options/` | `GET` | Registered conductors, buses, and routes |
| `/api/v1/admin/shifts/` | `GET` / `POST` | List shifts / Deploy new shift to wake ETM |
| `/api/v1/admin/shifts/<id>/close/` | `POST` | Complete and close active shift |
| `/api/v1/admin/shifts/<id>/reassign-bus/` | `POST` | Mid-shift vehicle swap during highway breakdowns |
| `/api/v1/admin/revenue/` | `GET` | Real-time cash vs. UPI financial reconciliation |
| `/api/v1/admin/incidents/` | `GET` | Conductor SOS alerts and road hazard warnings |
| `/api/v1/admin/incidents/<id>/acknowledge/` | `PATCH` | Silence emergency alarm in the UI |
