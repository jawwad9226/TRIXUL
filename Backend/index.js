const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

// Load per-folder environment values before the server reads them.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key && process.env[key] == null) {
        process.env[key] = value;
      }
    });
}

loadEnvFile(path.join(__dirname, ".env"));

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || "*";
const allowedOrigins =
  corsOrigin === "*"
    ? true
    : corsOrigin
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
// File: index.js
// Purpose: Hosts the ETM backend API, seed data, and live telemetry endpoints.
// Imports: express, cors, and local environment values.
// Behavior: Frontend and other clients read route, conductor, fleet, and bus-location data from here.
const HOST = process.env.HOST || "0.0.0.0";

// Seed route data stays in memory so route, fare, and initializer screens can bootstrap instantly.
const routeFareTable = [
  { id: "f1", from: "Jalgaon", to: "Kherda", price: 20 },
  { id: "f2", from: "Jalgaon", to: "Changefal", price: 25 },
  { id: "f3", from: "Jalgaon", to: "Nivana", price: 31 },
  { id: "f4", from: "Jalgaon", to: "Sangrampur", price: 36 },
  { id: "f5", from: "Kherda", to: "Changefal", price: 13 },
  { id: "f6", from: "Kherda", to: "Nivana", price: 21 },
  { id: "f7", from: "Kherda", to: "Sangrampur", price: 29 },
  { id: "f8", from: "Changefal", to: "Nivana", price: 11 },
  { id: "f9", from: "Changefal", to: "Sangrampur", price: 19 },
  { id: "f10", from: "Nivana", to: "Sangrampur", price: 11 },
];
const routeStops = [
  {
    id: "s1",
    index: 1,
    totalStops: 5,
    name: "Jalgaon",
    coordinate: { latitude: 17.385, longitude: 78.4867 },
  },
  {
    id: "s2",
    index: 2,
    totalStops: 5,
    name: "Kherda",
    coordinate: { latitude: 17.392, longitude: 78.4955 },
  },
  {
    id: "s3",
    index: 3,
    totalStops: 5,
    name: "Changefal",
    coordinate: { latitude: 17.401, longitude: 78.504 },
  },
  {
    id: "s4",
    index: 4,
    totalStops: 5,
    name: "Nivana",
    coordinate: { latitude: 17.409, longitude: 78.514 },
  },
  {
    id: "s5",
    index: 5,
    totalStops: 5,
    name: "Sangrampur",
    coordinate: { latitude: 17.421, longitude: 78.526 },
  },
];
const routeData = {
  id: "route-102",
  busNumber: "TS09 TRX 102",
  routeName: "Terminal Express Corridor",
  startingPoint: "Jalgaon",
  endingPoint: "Sangrampur",
  busType: "Express",
  currency: "INR",
  stops: routeStops,
  totalStops: routeStops.length,
  fareTable: routeFareTable,
  routeColor: "#0f62fe",
};
// Conductor data feeds the dashboard, initializer, and emergency flows.
const conductorData = {
  id: "cond-1001",
  conductorName: "Harshal Patil",
  conductorId: "CT-2087",
  busId: "BUS-102",
  depot: "Central Depot",
  route: routeData,
  shift: "06:00 - 14:00",
  syncStatus: "online",
};

// Active buses are updated in place when live GPS reports arrive.
let activeBuses = [
  {
    busId: "BUS-101",
    busNumber: "TS09 TRX 101",
    routeName: "City Loop",
    occupancy: 64,
    currentStop: "Kherda",
    status: "Running",
  },
  {
    busId: "BUS-102",
    busNumber: "TS09 TRX 102",
    routeName: "Terminal Express Corridor",
    occupancy: 49,
    currentStop: "Changefal",
    status: "Boarding",
  },
  {
    busId: "BUS-144",
    busNumber: "TS09 TRX 144",
    routeName: "Airport Connector",
    occupancy: 86,
    currentStop: "Sangrampur",
    status: "Delayed",
  },
  {
    busId: "BUS-155",
    busNumber: "TS09 TRX 155",
    routeName: "Outer Ring Route",
    occupancy: 31,
    currentStop: "Jalgaon",
    status: "Stopped",
  },
];

const updates = [
  {
    id: "u1",
    title: "Route Adjustment",
    body: "Terminal Express will skip Market Lane from 11:00 due to repairs.",
    priority: "High",
    timestamp: new Date().toISOString(),
    unread: true,
    completed: false,
    category: "Route Change",
  },
  {
    id: "u2",
    title: "Fuel Check Reminder",
    body: "Log the fuel card reading after every shift handover.",
    priority: "Medium",
    timestamp: new Date(Date.now() - 3600_000).toISOString(),
    unread: true,
    completed: false,
    category: "Task",
  },
  {
    id: "u3",
    title: "Operator Notice",
    body: "Body camera audit scheduled at central depot tomorrow 09:30.",
    priority: "Low",
    timestamp: new Date(Date.now() - 86_400_000).toISOString(),
    unread: false,
    completed: true,
    category: "Announcement",
  },
];

// Stores the latest GPS packet per bus, plus a history feed for other clients.
const liveTelemetryByBusId = new Map();
const liveTelemetryHistory = [];

// Convert degrees to radians for the distance calculation below.
function toRad(value) {
  return (value * Math.PI) / 180;
}

// Compute the distance between the bus and a stop so we can infer route progress.
function distanceKm(a, b) {
  const earthRadiusKm = 6371;
  const deltaLat = toRad(b.latitude - a.latitude);
  const deltaLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Find the stop closest to the reported bus location.
function getRouteProgressIndex(location) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  routeStops.forEach((stop, index) => {
    const currentDistance = distanceKm(location, stop.coordinate);
    if (currentDistance < closestDistance) {
      closestDistance = currentDistance;
      closestIndex = index;
    }
  });

  return { closestIndex, closestDistance };
}

// Convert a raw GPS point into the response shape used by the app and other clients.
function buildTelemetrySummary(telemetry) {
  const location = {
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
  };
  const { closestIndex, closestDistance } = getRouteProgressIndex(location);
  const currentStop = routeStops[closestIndex] ?? routeStops[0];
  const nextStop =
    routeStops[Math.min(closestIndex + 1, routeStops.length - 1)] ??
    currentStop;
  const speed = Math.max(0, Number(telemetry.speed) || 0);
  const etaMinutes =
    speed > 0 && nextStop
      ? Math.max(1, Math.round((closestDistance / speed) * 60))
      : null;

  return {
    busId: telemetry.busId,
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    speed,
    timestamp: telemetry.timestamp,
    receivedAt: new Date().toISOString(),
    currentStop: currentStop ? currentStop.name : "Unknown",
    nextStop: nextStop ? nextStop.name : "Unknown",
    etaMinutes,
    condition: speed > 0.1 ? "Moving" : "Stationary",
    progress: routeStops.length
      ? Math.round(((closestIndex + 1) / routeStops.length) * 100)
      : 0,
  };
}

// Refresh the active-bus list so the dashboard and fleet screens stay in sync.
function upsertActiveBus(summary) {
  const existingIndex = activeBuses.findIndex(
    (bus) => bus.busId === summary.busId,
  );
  const nextEntry = {
    busId: summary.busId,
    busNumber: routeData.busNumber,
    routeName: routeData.routeName,
    occupancy: activeBuses[existingIndex]?.occupancy ?? 0,
    currentStop: summary.currentStop,
    status: summary.condition === "Moving" ? "Running" : "Stationary",
    speed: summary.speed,
    lastReportedAt: summary.receivedAt,
  };

  if (existingIndex >= 0) {
    activeBuses[existingIndex] = nextEntry;
    return;
  }

  activeBuses = [nextEntry, ...activeBuses];
}

// Return the most recent telemetry snapshot for one bus, or the default bus if omitted.
function getLatestTelemetry(busId) {
  const resolvedBusId = busId || conductorData.busId;
  const telemetry = liveTelemetryByBusId.get(resolvedBusId);
  if (!telemetry) {
    return null;
  }

  return buildTelemetrySummary(telemetry);
}

// Normalizes the latest telemetry into the common JSON wrapper used by read endpoints.
function sendTelemetryResponse(res, busId) {
  const telemetry = getLatestTelemetry(busId);
  if (!telemetry) {
    return res.json({ ok: true, telemetry: null });
  }

  return res.json({ ok: true, telemetry });
}

// Provide the shared history feed that other apps can use for reporting or dashboards.
function getTelemetryHistory(busId) {
  if (!busId) {
    return liveTelemetryHistory.slice();
  }

  return liveTelemetryHistory.filter((entry) => entry.busId === busId);
}
// Bind to the configured host so LAN and emulator testing both work.
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}/`);
});

// Health check for local testing and startup verification.
app.get("/", (req, res) => {
  res.json({ message: "API is working fine" });
});

// Route payload used by the app's route, fare, and initializer flows.
app.get("/routeData", (req, res) => {
  res.json({
    routeStops,
    routeFareTable,
    route: routeData,
  });
});

// Conductor profile is exposed separately so the interface can bootstrap it independently.
app.get("/conductorData", (req, res) => {
  res.json({ conductor: conductorData });
});

// Bus status now comes from the latest live telemetry rather than random simulation.
app.get("/busStatus", (req, res) => {
  sendTelemetryResponse(res, req.query.busId);
});

// Convenience endpoint for clients that only need the latest GPS snapshot.
app.get("/busLocation/latest", (req, res) => {
  sendTelemetryResponse(res, req.query.busId);
});

// Shared location feed so other apps in the organization can read the history.
app.get("/busLocation", (req, res) => {
  res.json({
    ok: true,
    telemetry: getTelemetryHistory(req.query.busId),
  });
});

// Single-bus lookup for consumers that need the current record by bus id.
app.get("/busLocation/:busId", (req, res) => {
  const telemetry = getLatestTelemetry(req.params.busId);
  if (!telemetry) {
    return res
      .status(404)
      .json({ ok: false, error: "Bus telemetry not found" });
  }

  return res.json({ ok: true, telemetry });
});

// Accept the live GPS report from the bus, store it, and update the active fleet view.
app.post("/busLocation", (req, res) => {
  const busId =
    req.body && req.body.busId ? String(req.body.busId) : conductorData.busId;
  const latitude = Number(req.body && req.body.latitude);
  const longitude = Number(req.body && req.body.longitude);
  const speed = Number(req.body && req.body.speed);
  const timestamp =
    req.body && req.body.timestamp
      ? String(req.body.timestamp)
      : new Date().toISOString();

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res
      .status(400)
      .json({ ok: false, error: "Invalid bus location payload" });
  }

  const telemetry = {
    busId,
    latitude,
    longitude,
    speed: Number.isFinite(speed) ? speed : 0,
    timestamp,
  };

  liveTelemetryByBusId.set(busId, telemetry);
  liveTelemetryHistory.push({
    ...telemetry,
    receivedAt: new Date().toISOString(),
  });
  const summary = buildTelemetrySummary(telemetry);
  upsertActiveBus(summary);

  return res.json({ ok: true, telemetry: summary });
});

// Active fleet endpoint used by the dashboard and other operational screens.
app.get("/activeBuses", (req, res) => {
  res.json({ activeBuses });
});

// Updates feed for announcements, route changes, and task reminders.
app.get("/updates", (req, res) => {
  res.json({ updates });
});
