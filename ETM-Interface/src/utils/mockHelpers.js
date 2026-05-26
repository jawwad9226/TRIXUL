// File: src/utils/mockHelpers.js
// Purpose: Generates deterministic-looking ids for temporary app data.
// Imports: none.
// Behavior: Services and slices use it when they need a lightweight local id.
export const seededId = (prefix) =>
  `${prefix}-${Math.floor(Math.random() * 900000 + 100000)}`;
