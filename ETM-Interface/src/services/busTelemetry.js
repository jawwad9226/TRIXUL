import AsyncStorage from "@react-native-async-storage/async-storage";

import { storage } from "./storage";

const pendingTelemetryKey = "@trixual/pending-bus-location-updates";
const apiBaseUrls = [
  process.env.EXPO_PUBLIC_API_BASE_URL,
  "http://10.238.218.165:3000",
  "http://localhost:3000",
].filter(Boolean);

async function loadPendingTelemetry() {
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

async function savePendingTelemetry(payloads) {
  if (!payloads.length) {
    await AsyncStorage.removeItem(pendingTelemetryKey);
    return;
  }

  await AsyncStorage.setItem(pendingTelemetryKey, JSON.stringify(payloads));
}

async function resolveBaseUrls() {
  const override = await storage.loadApiBaseUrl(null);
  let candidates = apiBaseUrls.slice();

  if (override) {
    candidates = [override, ...candidates.filter((url) => url !== override)];
  }

  return candidates;
}

function normalizeTelemetry(payload) {
  return {
    busId: payload.busId ?? null,
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    speed: Number.isFinite(Number(payload.speed)) ? Number(payload.speed) : 0,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

async function postTelemetryAcrossBaseUrls(path, payload) {
  const baseUrls = await resolveBaseUrls();

  for (const baseUrl of baseUrls) {
    try {
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

async function fetchTelemetryAcrossBaseUrls(path) {
  const baseUrls = await resolveBaseUrls();

  for (const baseUrl of baseUrls) {
    try {
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

async function flushPendingTelemetry() {
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

export async function reportBusLocation(payload) {
  const telemetry = normalizeTelemetry(payload);
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

export async function fetchLiveBusStatus() {
  return fetchTelemetryAcrossBaseUrls("/busStatus");
}

export async function fetchLatestBusLocation() {
  return fetchTelemetryAcrossBaseUrls("/busLocation/latest");
}

export async function clearQueuedBusTelemetry() {
  await savePendingTelemetry([]);
}
