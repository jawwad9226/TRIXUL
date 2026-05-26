// File: src/constants/theme.js
// Purpose: Central color, spacing, radius, shadow, and navigation theme values.
// Imports: none.
// Behavior: Visual changes ripple through every component that reads these tokens.
export const colors = {
  light: {
    background: "#f4f7fb",
    surface: "#ffffff",
    surfaceAlt: "#edf3fb",
    primary: "#0f62fe",
    primarySoft: "#dbe7ff",
    secondary: "#0b1f33",
    text: "#102033",
    textMuted: "#66758a",
    border: "#d7e1ee",
    success: "#118a4b",
    warning: "#cc7a00",
    danger: "#c53434",
    info: "#1363df",
  },
  dark: {
    background: "#07111f",
    surface: "#0f1c2f",
    surfaceAlt: "#13253d",
    primary: "#7db1ff",
    primarySoft: "#183255",
    secondary: "#d7e2f2",
    text: "#eef4ff",
    textMuted: "#93a6bd",
    border: "#20334d",
    success: "#36c276",
    warning: "#ffbb55",
    danger: "#ff6b6b",
    info: "#78aaff",
  },
};

export const navigationTheme = {
  light: {
    background: colors.light.background,
    card: colors.light.surface,
    text: colors.light.text,
    border: colors.light.border,
    primary: colors.light.primary,
    notification: colors.light.danger,
  },
  dark: {
    background: colors.dark.background,
    card: colors.dark.surface,
    text: colors.dark.text,
    border: colors.dark.border,
    primary: colors.dark.primary,
    notification: colors.dark.danger,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

export const shadow = {
  light: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
};
