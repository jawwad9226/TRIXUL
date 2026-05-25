import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../constants/theme";

export const MetricPill = ({ label, value, tone = "primary" }) => {
  const map = {
    primary: colors.light.primarySoft,
    success: "#dff5e7",
    warning: "#fff1d9",
    danger: "#fde3e3",
  };

  return (
    <View style={[styles.pill, { backgroundColor: map[tone] }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: { padding: spacing.md, borderRadius: radii.md, minWidth: 110 },
  value: { fontSize: 18, fontWeight: "800", color: colors.light.text },
  label: { marginTop: 4, color: colors.light.textMuted, fontSize: 12 },
});
