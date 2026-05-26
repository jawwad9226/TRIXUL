// File: src/services/storage.js
// Purpose: Wraps AsyncStorage keys and serialization for the app.
// Imports: AsyncStorage only.
// Behavior: Higher-level services and slices use this to persist local data.
import AsyncStorage from "@react-native-async-storage/async-storage";

const keys = {
  ticketHistory: "@trixual/ticket-history",
  routeDraft: "@trixual/route-draft",
  routeData: "@trixual/route-data",
  conductorData: "@trixual/conductor-data",
  activeBuses: "@trixual/active-buses",
  updates: "@trixual/updates",
  legacyMockData: "@trixual/mock-data",
  apiBaseUrl: "@trixual/api-base-url",
};

async function saveValue(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function loadValue(key, fallback) {
  const value = await AsyncStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (e) {
    // corrupted value, clear and return fallback
    await AsyncStorage.removeItem(key);
    return fallback;
  }
}

async function clearKey(key) {
  await AsyncStorage.removeItem(key);
}

export const storage = {
  async appendTicket(ticket) {
    const current = await loadValue(keys.ticketHistory, []);
    await saveValue(keys.ticketHistory, [ticket, ...current]);
  },

  async loadTicketHistory(fallback = []) {
    return loadValue(keys.ticketHistory, fallback);
  },

  async clearTicketHistory() {
    await clearKey(keys.ticketHistory);
  },

  async saveRouteDraft(draft) {
    await saveValue(keys.routeDraft, draft);
  },

  async loadRouteDraft(fallback) {
    return loadValue(keys.routeDraft, fallback);
  },

  async saveRouteData(payload) {
    await saveValue(keys.routeData, payload);
  },

  async loadRouteData(fallback = null) {
    return loadValue(keys.routeData, fallback);
  },

  async clearRouteData() {
    await clearKey(keys.routeData);
  },

  async saveConductorData(payload) {
    await saveValue(keys.conductorData, payload);
  },

  async loadConductorData(fallback = null) {
    return loadValue(keys.conductorData, fallback);
  },

  async clearConductorData() {
    await clearKey(keys.conductorData);
  },

  async saveActiveBuses(payload) {
    await saveValue(keys.activeBuses, payload);
  },

  async loadActiveBuses(fallback = null) {
    return loadValue(keys.activeBuses, fallback);
  },

  async clearActiveBuses() {
    await clearKey(keys.activeBuses);
  },

  async saveUpdates(payload) {
    await saveValue(keys.updates, payload);
  },

  async loadUpdates(fallback = null) {
    return loadValue(keys.updates, fallback);
  },

  async clearUpdates() {
    await clearKey(keys.updates);
  },

  async clearMockData() {
    await Promise.all([
      clearKey(keys.routeData),
      clearKey(keys.conductorData),
      clearKey(keys.activeBuses),
      clearKey(keys.updates),
      clearKey(keys.legacyMockData),
    ]);
  },

  async saveApiBaseUrl(url) {
    await saveValue(keys.apiBaseUrl, url);
  },

  async loadApiBaseUrl(fallback = null) {
    return loadValue(keys.apiBaseUrl, fallback);
  },

  async clearApiBaseUrl() {
    await clearKey(keys.apiBaseUrl);
  },
};
