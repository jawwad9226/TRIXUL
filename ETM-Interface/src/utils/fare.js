// routeFareTable is provided by the active route payload; avoid importing mock data at module load

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
      accumulator[key] = item.price;
    }
    return accumulator;
  }, {});

export const totalPassengers = (counts) =>
  counts.women + counts.seniors + counts.children + counts.adultMale;

export const getStopPrice = (route, boardingStop, destinationStop) => {
  const key = normalizeStopPair(boardingStop, destinationStop);
  if (!key) {
    return 0;
  }

  const localFareMap = route?.fareMap ?? buildFareMap(route?.fareTable ?? []);
  return localFareMap[key] ?? 0;
};

export const calculateFare = (route, boardingStop, destinationStop, counts) => {
  const boarding = route?.stops?.find((stop) => stop.name === boardingStop);
  const destination = route?.stops?.find(
    (stop) => stop.name === destinationStop,
  );

  if (!boarding || !destination) {
    return {
      boardingStop,
      destinationStop,
      stopPair: null,
      stopLabel: null,
      baseFare: 0,
      passengerCount: totalPassengers(counts),
      subtotal: 0,
      discount: 0,
      finalAmount: 0,
    };
  }

  const stopPair = normalizeStopPair(boardingStop, destinationStop);
  const stopLabel = `${boardingStop} to ${destinationStop}`;
  const baseFare = getStopPrice(route, boardingStop, destinationStop);
  const passengerCount = totalPassengers(counts);
  const womenDiscount = counts.women * 0.5;
  const discount = Math.max(baseFare * womenDiscount, 0);
  const subtotal = baseFare * passengerCount;
  const finalAmount = Math.max(subtotal - discount, 0);

  return {
    boardingStop,
    destinationStop,
    stopPair,
    stopLabel,
    baseFare,
    passengerCount,
    subtotal,
    discount,
    finalAmount,
  };
};
