// File: src/components/AppCard.js
// Purpose: Renders the dashboard tile that routes users into screens.
// Imports: theme constants and the gradient background.
// Behavior: Pressing the card triggers navigation supplied by the caller.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, radii, shadow, spacing } from "../constants/theme";

export const AppCard = ({
  title,
  subtitle,
  icon,
  accent = colors.light.primary,
  onPress,
  footer,
}) => (
  <Pressable onPress={onPress} style={styles.wrapper}>
    <LinearGradient
      colors={[accent, `${accent}cc`, "#ffffff10"]}
      style={styles.card}
    >
      <View style={styles.iconBubble}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </LinearGradient>
  </Pressable>
);

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  card: {
    aspectRatio: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    overflow: "hidden",
    justifyContent: "space-between",
    ...shadow.light,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff22",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  subtitle: {
    color: "#f1f5ff",
    marginTop: spacing.xs,
    lineHeight: 17,
    fontSize: 12,
  },
  footer: { marginTop: spacing.md },
});
