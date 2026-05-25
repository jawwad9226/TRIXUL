import { seededId } from "../utils/mockHelpers";
import { initializerSecurityFlow } from "../constants/flow/security";
import {
  loadActiveBusesData,
  loadConductorData,
  loadRouteData,
  loadUpdatesData,
} from "./mockData";
import { fetchLatestBusLocation, fetchLiveBusStatus } from "./busTelemetry";
import { storage } from "./storage";

const resourceDefinitions = {
  routeData: {
    loadRemote: loadRouteData,
    loadCache: storage.loadRouteData,
    saveCache: storage.saveRouteData,
    errorLabel: "route data",
  },
  conductorData: {
    loadRemote: loadConductorData,
    loadCache: storage.loadConductorData,
    saveCache: storage.saveConductorData,
    errorLabel: "conductor data",
  },
  activeBuses: {
    loadRemote: loadActiveBusesData,
    loadCache: storage.loadActiveBuses,
    saveCache: storage.saveActiveBuses,
    errorLabel: "active buses",
  },
  updates: {
    loadRemote: loadUpdatesData,
    loadCache: storage.loadUpdates,
    saveCache: storage.saveUpdates,
    errorLabel: "updates",
  },
};

const resourcePromises = {
  routeData: null,
  conductorData: null,
  activeBuses: null,
  updates: null,
};

// diagnostic exports (updated when data is loaded)
export let lastMockDataSource = null; // 'remote' | 'cache'
export let lastMockDataTime = null; // ISO timestamp

function resetResourcePromises() {
  resourcePromises.routeData = null;
  resourcePromises.conductorData = null;
  resourcePromises.activeBuses = null;
  resourcePromises.updates = null;
}

function setDiagnostics(source) {
  lastMockDataSource = source;
  lastMockDataTime = new Date().toISOString();
}

async function getResourceData(resourceName, options = {}) {
  const { forceRemote = false } = options;
  const definition = resourceDefinitions[resourceName];
  console.log("mockApi: getResourceData called", resourceName, { forceRemote });

  if (!forceRemote && resourcePromises[resourceName]) {
    return resourcePromises[resourceName];
  }

  if (forceRemote) {
    resourcePromises[resourceName] = null;
  }

  const remote = await definition.loadRemote({ strictRemote: forceRemote });

  if (remote) {
    console.log("mockApi: obtained remote payload for", resourceName);
    setDiagnostics("remote");
    try {
      await definition.saveCache(remote);
    } catch (e) {
      // ignore cache write failures
    }
    resourcePromises[resourceName] = Promise.resolve(remote);
    return remote;
  }

  const cached = await definition.loadCache(null);
  if (cached) {
    console.log("mockApi: using cached payload for", resourceName);
    setDiagnostics("cache");
    resourcePromises[resourceName] = Promise.resolve(cached);
    return cached;
  }

  throw new Error(
    `Mock ${definition.errorLabel} unavailable. Start the backend API or restore cached data.`,
  );
}

async function warmAllResources() {
  const [routeData, conductorData, activeBuses, updates] = await Promise.all([
    getResourceData("routeData", { forceRemote: true }),
    getResourceData("conductorData", { forceRemote: true }),
    getResourceData("activeBuses", { forceRemote: true }),
    getResourceData("updates", { forceRemote: true }),
  ]);

  setDiagnostics("remote");
  return {
    ...routeData,
    conductor: conductorData,
    activeBuses: activeBuses.activeBuses,
    updates: updates.updates,
  };
}

export const mockApi = {
  async fetchConductorProfile(options = {}) {
    const { conductor } = await getResourceData("conductorData", options);
    return conductor;
  },

  async fetchRoute(options = {}) {
    const { route } = await getResourceData("routeData", options);
    return route;
  },

  async verifyInitializerCode(code) {
    // Change the unlock code in `src/constants/flow/security.js`.
    return request(() => ({
      valid: code === initializerSecurityFlow.verificationCode,
    }));
  },

  async submitTicketBooking(payload) {
    return request(() => ({ ok: true, ticketId: payload.ticketId }));
  },

  async verifyPayment(amount) {
    return request(() => ({
      status: amount > 0 ? "success" : "failed",
      referenceId: `PAY-${seededId("ref")}`,
    }));
  },

  async fetchBusStatus() {
    return fetchLiveBusStatus();
  },

  async fetchLocation() {
    return fetchLatestBusLocation();
  },

  async fetchActiveBuses() {
    const { activeBuses } = await getResourceData("activeBuses");
    return activeBuses;
  },

  async fetchUpdates() {
    const { updates } = await getResourceData("updates");
    return updates;
  },

  async submitEmergencyAlert(alert) {
    return request(() => ({ ok: true, alertId: alert.id }));
  },

  // Force reload of the underlying mock data source (clears cache)
  async reloadMock() {
    console.log(
      "mockApi: reloadMock requested — clearing cache and forcing remote",
    );
    await storage.clearMockData();
    resetResourcePromises();
    const data = await warmAllResources();
    return data;
  },

  async clearMockCache() {
    console.log("mockApi: clearMockCache called");
    await storage.clearMockData();
    resetResourcePromises();
    lastMockDataSource = null;
    lastMockDataTime = null;
  },
};

async function request(resolver, options = {}) {
  return Promise.resolve().then(() => resolver());
}
