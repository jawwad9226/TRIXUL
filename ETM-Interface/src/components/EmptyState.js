import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../constants/theme";

export const EmptyState = ({ title, subtitle }) => (
  <View style={styles.wrap}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  title: { color: colors.light.text, fontWeight: "800", fontSize: 18 },
  subtitle: {
    color: colors.light.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 280,
  },
});
