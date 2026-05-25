import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../constants/theme";

export const StatusBadge = ({ label, tone = "info" }) => {
  const toneMap = {
    info: { bg: "#dbe7ff", fg: colors.light.info },
    success: { bg: "#dcf6e8", fg: colors.light.success },
    warning: { bg: "#fff1d9", fg: colors.light.warning },
    danger: { bg: "#fde3e3", fg: colors.light.danger },
  };

  const palette = toneMap[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.xl,
    alignSelf: "flex-start",
  },
  label: { fontSize: 12, fontWeight: "700" },
});
