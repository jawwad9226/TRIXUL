export const delay = (minMs, maxMs) =>
  new Promise((resolve) => {
    const timeout = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    setTimeout(resolve, timeout);
  });

export const seededId = (prefix) =>
  `${prefix}-${Math.floor(Math.random() * 900000 + 100000)}`;

export const randomFrom = (values) =>
  values[Math.floor(Math.random() * values.length)];
