import React from "react";
import { ScrollView, StyleSheet, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "../constants/theme";

export const Screen = ({ children, scroll = true }) => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const content = <View style={styles.container}>{children}</View>;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors[scheme].background }]}
    >
      {scroll ? <ScrollView>{content}</ScrollView> : content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
