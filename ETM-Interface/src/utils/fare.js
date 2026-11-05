// File: src/utils/fare.js
// Purpose: Calculates fare, stop pairs, and passenger totals from route data with scheme concessions.
// Imports: none at module load.
// Behavior: Supports both stop IDs and stop names, and matches against route.fares or route.fareTable.

export const normalizeStopPair = (boardingStop, destinationStop) => {
  if (!boardingStop || !destinationStop) {
    return null;
  }
  return [boardingStop, destinationStop].sort().join("|");
};

export const buildFareMap = (fareTable = []) =>
  fareTable.reduce((accumulator, item) => {
    const key = normalizeStopPair(item.from, item.to);
    if (key) {
      accumulator[key] = Number(item.price);
    }
    return accumulator;
  }, {});

export const totalPassengers = (counts) =>
  (counts?.women || 0) +
  (counts?.seniors || 0) +
  (counts?.children || 0) +
  (counts?.adultMale || 0);

export const getStopPrice = (route, boardingStop, destinationStop) => {
  if (!boardingStop || !destinationStop || !route) {
    return 0;
  }

  const stops = route.stops || [];
  const bStop = stops.find(
    (s) => (s.id || s.stop_id) === boardingStop || s.name === boardingStop
  );
  const dStop = stops.find(
    (s) => (s.id || s.stop_id) === destinationStop || s.name === destinationStop
  );

  const bName = bStop?.name || boardingStop;
  const dName = dStop?.name || destinationStop;
  const bId = bStop?.stop_id || bStop?.id || boardingStop;
  const dId = dStop?.stop_id || dStop?.id || destinationStop;

  const faresList = route.fares || route.fareTable || [];

  for (const item of faresList) {
    const fromMatches =
      item.from === bName || item.from === bId || item.from_stop_id === bId;
    const toMatches =
      item.to === dName || item.to === dId || item.to_stop_id === dId;

    const reverseFromMatches =
      item.from === dName || item.from === dId || item.from_stop_id === dId;
    const reverseToMatches =
      item.to === bName || item.to === bId || item.to_stop_id === bId;

    if ((fromMatches && toMatches) || (reverseFromMatches && reverseToMatches)) {
      return Number(item.price) || 0;
    }
  }

  // Fallback to local fare map if present
  const key = normalizeStopPair(bName, dName);
  if (key && route.fareMap && route.fareMap[key] != null) {
    return Number(route.fareMap[key]) || 0;
  }

  // Fallback: estimate using distance if available
  if (bStop && dStop && bStop.index != null && dStop.index != null) {
    const stopDiff = Math.abs(dStop.index - bStop.index);
    return Math.max(10, stopDiff * 15);
  }

  return 0;
};

export const calculateFare = (route, boardingStop, destinationStop, counts) => {
  const safeCounts = counts || { women: 0, seniors: 0, children: 0, adultMale: 0 };
  const boarding = route?.stops?.find(
    (stop) => (stop.id || stop.stop_id) === boardingStop || stop.name === boardingStop
  );
  const destination = route?.stops?.find(
    (stop) => (stop.id || stop.stop_id) === destinationStop || stop.name === destinationStop
  );

  if (!boarding || !destination) {
    return {
      boardingStop,
      destinationStop,
      stopPair: null,
      stopLabel: null,
      baseFare: 0,
      passengerCount: totalPassengers(safeCounts),
      subtotal: 0,
      discount: 0,
      finalAmount: 0,
    };
  }

  const stopPair = normalizeStopPair(boarding.name, destination.name);
  const stopLabel = `${boarding.name} to ${destination.name}`;
  const baseFare = getStopPrice(route, boardingStop, destinationStop);
  const passengerCount = totalPassengers(safeCounts);

  // Scheme/Yojana Concessions:
  // Admin-configurable schemes from route.activeYojnas or route.concessions
  const activeYojnas = route?.activeYojnas ?? {
    mahilaSanman: true, // 50% discount for female passengers (Government scheme)
    seniorCitizen: true, // 100% discount for 75+ seniors
    childConcession: true, // 50% half-ticket for kids
  };

  const womenDiscountPer = activeYojnas.mahilaSanman ? 0.5 : 0;
  const seniorDiscountPer = activeYojnas.seniorCitizen ? 1.0 : 0.5; // free or half
  const childDiscountPer = activeYojnas.childConcession ? 0.5 : 0;

  const womenDiscount = (safeCounts.women || 0) * baseFare * womenDiscountPer;
  const seniorDiscount = (safeCounts.seniors || 0) * baseFare * seniorDiscountPer;
  const childDiscount = (safeCounts.children || 0) * baseFare * childDiscountPer;

  const totalDiscount = Math.round(womenDiscount + seniorDiscount + childDiscount);
  const subtotal = Math.round(baseFare * passengerCount);
  const finalAmount = Math.max(subtotal - totalDiscount, 0);

  return {
    boardingStop: boarding.stop_id || boarding.id,
    destinationStop: destination.stop_id || destination.id,
    stopPair,
    stopLabel,
    baseFare,
    passengerCount,
    subtotal,
    discount: totalDiscount,
    finalAmount,
  };
};
