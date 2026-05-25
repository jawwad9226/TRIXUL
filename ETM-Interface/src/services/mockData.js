import { storage } from "./storage";

const apiBaseUrls = [
  process.env.EXPO_PUBLIC_API_BASE_URL,
  "http://10.238.218.165:3000", // local network IP (for physical device testing)
  "http://localhost:3000", // localhost (for emulator/simulator testing)
].filter(Boolean);

const resourceDefinitions = {
  routeData: {
    path: "/routeData",
    label: "route data",
    requiredKeys: ["routeStops", "routeFareTable", "route"],
  },
  conductorData: {
    path: "/conductorData",
    label: "conductor data",
    requiredKeys: ["conductor"],
  },
  activeBuses: {
    path: "/activeBuses",
    label: "active buses",
    requiredKeys: ["activeBuses"],
  },
  updates: {
    path: "/updates",
    label: "updates",
    requiredKeys: ["updates"],
  },
};

function verifyResourcePayload(resourceName, payload) {
  const definition = resourceDefinitions[resourceName];
  const data = payload && typeof payload === "object" ? payload : {};
  const missingKeys = definition.requiredKeys.filter(
    (key) => !(key in data) || data[key] == null,
  );

  const invalidKeys = definition.requiredKeys.filter((key) => {
    if (!(key in data) || data[key] == null) {
      return false;
    }

    if (key === "routeStops" || key === "routeFareTable") {
      return !Array.isArray(data[key]);
    }

    if (key === "activeBuses" || key === "updates") {
      return !Array.isArray(data[key]);
    }

    return typeof data[key] !== "object" || Array.isArray(data[key]);
  });

  return {
    ok: missingKeys.length === 0 && invalidKeys.length === 0,
    missingKeys,
    invalidKeys,
  };
}

async function fetchRemoteResource(resourceName) {
  const definition = resourceDefinitions[resourceName];
  const override = await storage.loadApiBaseUrl(null);
  let triedUrls = apiBaseUrls.slice();
  if (override) {
    triedUrls = [override, ...triedUrls.filter((u) => u !== override)];
  }

  console.log("mockData: attempting remote fetch for", resourceName, triedUrls);
  for (const baseUrl of triedUrls) {
    try {
      const url = `${baseUrl}${definition.path}`;
      console.log("mockData: trying", url);
      const res = await fetch(url);
      if (res && res.ok) {
        const data = await res.json();
        const verification = verifyResourcePayload(resourceName, data);
        if (verification.ok) {
          console.log("mockData: remote fetch succeeded for", resourceName);
          return data;
        }
        console.log(
          "mockData: remote payload failed verification",
          resourceName,
          verification,
        );
      } else {
        console.log(
          "mockData: remote fetch returned non-ok response for",
          resourceName,
          baseUrl,
        );
      }
    } catch (e) {
      console.log(
        "mockData: fetch failed for",
        resourceName,
        baseUrl,
        e && e.message,
      );
      // try next base url
    }
  }

  return null;
}

async function loadResource(resourceName, options = {}) {
  const { strictRemote = false } = options;
  console.log("mockData: loadResource options", resourceName, options);
  const remoteData = await fetchRemoteResource(resourceName);

  if (remoteData) {
    console.log("mockData: using remote data for", resourceName);
    return remoteData;
  }

  console.log("mockData: remote data not available for", resourceName);

  if (strictRemote) {
    throw new Error(
      `Unable to fetch remote ${resourceDefinitions[resourceName].label} from its API endpoint`,
    );
  }

  return null;
}

export async function loadRouteData(options = {}) {
  return loadResource("routeData", options);
}

export async function loadConductorData(options = {}) {
  return loadResource("conductorData", options);
}

export async function loadActiveBusesData(options = {}) {
  return loadResource("activeBuses", options);
}

export async function loadUpdatesData(options = {}) {
  return loadResource("updates", options);
}
