// File: src/components/Screen.js
// Purpose: Standard page wrapper for safe-area and background behavior.
// Imports: theme colors and spacing.
// Behavior: Screens that use this wrapper inherit the same layout shell.
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "../constants/theme";

export const Screen = ({ children, scroll = true }) => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const content = <View style={styles.container}>{children}</View>;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors[scheme].background }]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%" },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 1200 : undefined,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
