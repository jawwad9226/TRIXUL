import React from "react";
import { StyleSheet, View } from "react-native";

import { colors, radii } from "../constants/theme";

export const ProgressBar = ({ progress }) => (
  <View style={styles.track}>
    <View
      style={[
        styles.fill,
        { width: `${Math.max(0, Math.min(progress, 100))}%` },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  track: {
    height: 10,
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.xl,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.light.primary,
    borderRadius: radii.xl,
  },
});
