import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../constants/theme";

export const SectionHeader = ({ title, actionLabel, onAction }) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {actionLabel ? (
      <Pressable onPress={onAction}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { color: colors.light.text, fontSize: 18, fontWeight: "700" },
  action: { color: colors.light.primary, fontWeight: "700" },
});
