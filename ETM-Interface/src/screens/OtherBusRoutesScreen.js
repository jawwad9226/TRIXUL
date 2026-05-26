// File: src/screens/OtherBusRoutesScreen.js
// Purpose: Lists other active buses and filters them locally.
// Imports: bus state and the refresh action.
// Behavior: This screen behaves like a live fleet browser, not an editor.
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { refreshActiveBuses } from "../store/slices/busSlice";

export const OtherBusRoutesScreen = () => {
  const dispatch = useAppDispatch();
  const buses = useAppSelector((state) => state.bus.activeBuses);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(refreshActiveBuses());
    const timer = setInterval(() => dispatch(refreshActiveBuses()), 12000);
    return () => clearInterval(timer);
  }, [dispatch]);

  const filtered = buses.filter(
    (bus) =>
      bus.busNumber.toLowerCase().includes(query.toLowerCase()) ||
      bus.routeName.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Other Bus Routes</Text>
      <Text style={styles.subtitle}>
        Track active fleet vehicles, search by bus number or route, and monitor
        live occupancy.
      </Text>
      <TextInput
        placeholder="Search buses or routes"
        placeholderTextColor={colors.light.textMuted}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.busId}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.busNumber}>{item.busNumber}</Text>
                <Text style={styles.routeName}>{item.routeName}</Text>
              </View>
              <StatusBadge
                label={item.status}
                tone={
                  item.status === "Running"
                    ? "success"
                    : item.status === "Delayed"
                      ? "warning"
                      : item.status === "Stopped"
                        ? "danger"
                        : "info"
                }
              />
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="seat-recline-normal"
                  size={18}
                  color={colors.light.primary}
                />
                <Text style={styles.metaText}>{item.occupancy}% occupancy</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={18}
                  color={colors.light.primary}
                />
                <Text style={styles.metaText}>{item.currentStop}</Text>
              </View>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: { color: colors.light.text, fontSize: 24, fontWeight: "900" },
  subtitle: {
    color: colors.light.textMuted,
    marginTop: 6,
    marginBottom: spacing.lg,
  },
  list: { flex: 1 },
  search: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    color: colors.light.text,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  busNumber: { color: colors.light.text, fontWeight: "900", fontSize: 18 },
  routeName: { color: colors.light.textMuted, marginTop: 4 },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { color: colors.light.text, marginLeft: 6, fontWeight: "700" },
});
