import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radii, spacing } from "../constants/theme";

export const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
}) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.light.textMuted}
      keyboardType={keyboardType}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: colors.light.text, fontWeight: "700", marginBottom: 8 },
  input: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: colors.light.text,
  },
});
