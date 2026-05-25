import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radii, spacing } from "../constants/theme";

export const PrimaryButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  tone = "primary",
}) => {
  const palette = {
    primary: colors.light.primary,
    secondary: colors.light.secondary,
    danger: colors.light.danger,
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette, opacity: pressed || disabled ? 0.84 : 1 },
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
        ) : null}
        <Text style={styles.label}>{title}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  label: { color: "#fff", fontWeight: "800" },
});
