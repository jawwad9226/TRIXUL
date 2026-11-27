// File: src/components/MetricPill.js
// Purpose: Displays one dashboard metric with a tone-specific background.
// Imports: theme constants.
// Behavior: The caller decides which metric and value are shown.
import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { colors, radii, spacing } from "../constants/theme";

export const MetricPill = ({ label, value, tone = "primary" }) => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const isDark = scheme === "dark";

  const map = {
    primary: isDark ? "#183255" : colors.light.primarySoft,
    info: isDark ? "#172554" : "#e0f2fe",
    success: isDark ? "#143a29" : "#dff5e7",
    warning: isDark ? "#3d2b0e" : "#fff1d9",
    danger: isDark ? "#3b1717" : "#fde3e3",
  };

  const borderMap = {
    primary: isDark ? "#2563eb" : "#bfdbfe",
    info: isDark ? "#0284c7" : "#bae6fd",
    success: isDark ? "#16a34a" : "#bbf7d0",
    warning: isDark ? "#d97706" : "#fde68a",
    danger: isDark ? "#dc2626" : "#fecaca",
  };

  return (
    <View style={[styles.pill, { backgroundColor: map[tone] || map.primary, borderColor: borderMap[tone] || borderMap.primary }]}>
      <Text style={[styles.value, { color: isDark ? "#f8fafc" : colors.light.text }]}>{value}</Text>
      <Text style={[styles.label, { color: isDark ? "#94a3b8" : colors.light.textMuted }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  value: { fontSize: 16, fontWeight: "800" },
  label: { marginTop: 4, fontSize: 11, fontWeight: "600" },
});
