// File: src/components/Screen.js
// Purpose: Standard page wrapper for safe-area, background, and uniform back-navigation.
// Imports: theme colors, spacing, and navigation hooks.
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii, spacing } from "../constants/theme";

export const Screen = ({
  children,
  scroll = true,
  showBack = false,
  backTitle = "Back to Dashboard",
  onBack,
}) => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Dashboard");
    }
  };

  const content = (
    <View style={styles.container}>
      {showBack && (
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed
                ? colors[scheme].surfaceAlt
                : colors[scheme].surface,
              borderColor: colors[scheme].border,
            },
          ]}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={colors[scheme].text}
          />
          <Text style={[styles.backText, { color: colors[scheme].text }]}>
            {backTitle}
          </Text>
        </Pressable>
      )}
      {children}
    </View>
  );

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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  backText: {
    marginLeft: spacing.xs,
    fontSize: 14,
    fontWeight: "700",
  },
});
