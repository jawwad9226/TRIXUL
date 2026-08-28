// File: src/utils/gps.js
// Purpose: Calculates distance and proximity checks for live GPS logic.
// Imports: none.
// Behavior: Screens use these helpers to decide when route editing is allowed.
export const isNearPoint = (current, target, thresholdKm = 0.9) => {
  const km = distance(current, target);
  return km <= thresholdKm;
};

export const distance = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
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
};
