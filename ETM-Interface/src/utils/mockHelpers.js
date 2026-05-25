export const seededId = (prefix) =>
  `${prefix}-${Math.floor(Math.random() * 900000 + 100000)}`;
