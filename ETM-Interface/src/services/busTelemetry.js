// File: src/services/busTelemetry.js
// Purpose: Posts and fetches live bus location telemetry.
// Imports: AsyncStorage and storage helpers.
// Behavior: Queues offline reports and flushes them when the network returns.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { storage } from "./storage";

const pendingTelemetryKey = "@trixual/pending-bus-location-updates";
const apiBaseUrls = [
  process.env.EXPO_PUBLIC_API_BASE_URL,
  "http://localhost:3000",
].filter(Boolean);

// Read the queue of location points that could not be delivered earlier.
async function loadPendingTelemetry() {
  // Recover any unsent location reports from the last offline session.
  const raw = await AsyncStorage.getItem(pendingTelemetryKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    await AsyncStorage.removeItem(pendingTelemetryKey);
    return [];
  }
}

// Persist the queue so a later network recovery can flush it in order.
async function savePendingTelemetry(payloads) {
  if (!payloads.length) {
    // Remove the queue key once everything has been delivered.
    await AsyncStorage.removeItem(pendingTelemetryKey);
    return;
  }

  await AsyncStorage.setItem(pendingTelemetryKey, JSON.stringify(payloads));
}

// Resolve the API host list, putting any stored override ahead of the defaults.
async function resolveBaseUrls() {
  const override = await storage.loadApiBaseUrl(null);
  let candidates = apiBaseUrls.slice();

  if (override) {
    candidates = [override, ...candidates.filter((url) => url !== override)];
  }

  return candidates;
}

// Normalize GPS data before it is sent to the backend.
function normalizeTelemetry(payload) {
  return {
    busId: payload.busId ?? null,
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    speed: Number.isFinite(Number(payload.speed)) ? Number(payload.speed) : 0,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

// Try all known hosts until one accepts the live report.
async function postTelemetryAcrossBaseUrls(path, payload) {
  const baseUrls = await resolveBaseUrls();

  for (const baseUrl of baseUrls) {
    try {
      // Try each configured host until one accepts the live report.
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response || !response.ok) {
        continue;
      }

      const data = await response.json();
      return data && typeof data === "object" && "telemetry" in data
        ? data.telemetry
        : data;
    } catch (error) {
      // try the next base url
    }
  }

  throw new Error("Unable to reach the bus telemetry API");
}

// Try all known hosts until one returns the requested telemetry payload.
async function fetchTelemetryAcrossBaseUrls(path) {
  const baseUrls = await resolveBaseUrls();

  for (const baseUrl of baseUrls) {
    try {
      // Read the same live feed from whichever host is reachable.
      const response = await fetch(`${baseUrl}${path}`);

      if (!response || !response.ok) {
        continue;
      }

      const data = await response.json();
      return data && typeof data === "object" && "telemetry" in data
        ? data.telemetry
        : data;
    } catch (error) {
      // try the next base url
    }
  }

  throw new Error("Unable to load live telemetry from the backend");
}

// Send buffered points first so we do not lose older bus movement updates.
async function flushPendingTelemetry() {
  // Send queued locations first so updates stay in order.
  const pending = await loadPendingTelemetry();
  let flushedCount = 0;
  let remainingIndex = pending.length;

  for (let index = 0; index < pending.length; index += 1) {
    const entry = pending[index];
    try {
      await postTelemetryAcrossBaseUrls("/busLocation", entry);
      flushedCount += 1;
    } catch (error) {
      remainingIndex = index;
      break;
    }
  }

  if (remainingIndex < pending.length) {
    await savePendingTelemetry(pending.slice(remainingIndex));
  } else if (flushedCount > 0) {
    await savePendingTelemetry([]);
  }

  return flushedCount;
}

// Report the current bus location, queueing it locally if the network is down.
export async function reportBusLocation(payload) {
  const telemetry = normalizeTelemetry(payload);
  // Flush any older offline points before sending the latest one.
  const flushedCount = await flushPendingTelemetry();

  try {
    const sentTelemetry = await postTelemetryAcrossBaseUrls(
      "/busLocation",
      telemetry,
    );
    return {
      ok: true,
      queued: false,
      flushedCount,
      telemetry: sentTelemetry,
    };
  } catch (error) {
    const pending = await loadPendingTelemetry();
    pending.push(telemetry);
    await savePendingTelemetry(pending);
    return {
      ok: false,
      queued: true,
      flushedCount,
      telemetry,
      error:
        error instanceof Error ? error.message : "Unable to send telemetry",
    };
  }
}

// Read the current live bus status from the backend feed.
export async function fetchLiveBusStatus() {
  return fetchTelemetryAcrossBaseUrls("/busStatus");
}

// Read the latest GPS point from the backend feed.
export async function fetchLatestBusLocation() {
  return fetchTelemetryAcrossBaseUrls("/busLocation/latest");
}
