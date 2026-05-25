const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
const routeFareTable = [
  { id: "f1", from: "Jalgaon", to: "Kherda", price: 20 },
  { id: "f2", from: "Jalgaon", to: "Changefal", price: 22 },
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

const liveTelemetryByBusId = new Map();

function toRad(value) {
  return (value * Math.PI) / 180;
}

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
    condition: speed > 0.1 ? "Moving" : "Stopped",
    progress: routeStops.length
      ? Math.round(((closestIndex + 1) / routeStops.length) * 100)
      : 0,
  };
}

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
    status: summary.condition === "Moving" ? "Running" : "Stopped",
    speed: summary.speed,
    lastReportedAt: summary.receivedAt,
  };

  if (existingIndex >= 0) {
    activeBuses[existingIndex] = nextEntry;
    return;
  }

  activeBuses = [nextEntry, ...activeBuses];
}

function getLatestTelemetry(busId) {
  const resolvedBusId = busId || conductorData.busId;
  const telemetry = liveTelemetryByBusId.get(resolvedBusId);
  if (!telemetry) {
    return null;
  }

  return buildTelemetrySummary(telemetry);
}

function sendTelemetryResponse(res, busId) {
  const telemetry = getLatestTelemetry(busId);
  if (!telemetry) {
    return res.json({ ok: true, telemetry: null });
  }

  return res.json({ ok: true, telemetry });
}
// Bind to 0.0.0.0 so devices on the same network (or emulator mappings) can reach the server.
app.listen(3000, "0.0.0.0", () => {
  console.log("Listening on http://0.0.0.0:3000/");
});
app.get("/", (req, res) => {
  res.json({ message: "API is working fine" });
});
app.get("/routeData", (req, res) => {
  res.json({
    routeStops,
    routeFareTable,
    route: routeData,
  });
});
app.get("/conductorData", (req, res) => {
  res.json({ conductor: conductorData });
});
app.get("/busStatus", (req, res) => {
  sendTelemetryResponse(res, req.query.busId);
});
app.get("/busLocation/latest", (req, res) => {
  sendTelemetryResponse(res, req.query.busId);
});
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
  const summary = buildTelemetrySummary(telemetry);
  upsertActiveBus(summary);

  return res.json({ ok: true, telemetry: summary });
});
app.get("/activeBuses", (req, res) => {
  res.json(activeBuses);
});
app.get("/updates", (req, res) => {
  res.json(updates);
});
