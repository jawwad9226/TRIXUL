export const currency = (value) => `₹${value.toFixed(2)}`;

export const timeLabel = (value) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(date);
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const percentage = (value) => `${Math.round(value)}%`;
