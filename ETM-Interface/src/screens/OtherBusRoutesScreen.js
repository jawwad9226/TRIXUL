import React, { useEffect, useState, useCallback } from "react";
import { FlatList, StyleSheet, Text, TextInput, View, Pressable, RefreshControl } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setActiveBuses } from "../store/slices/busSlice";
import { fetchActiveFleet } from "../services/api";
import { storage } from "../services/storage";

export const OtherBusRoutesScreen = () => {
  const dispatch = useAppDispatch();
  const buses = useAppSelector((state) => state.bus.activeBuses);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadFleet = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchActiveFleet();
      const rawFleet = data?.fleet || (Array.isArray(data) ? data : []);
      const mapped = rawFleet.map((b) => ({
        busId: b.bus_id,
        busNumber: b.bus_number,
        routeName: b.route_name,
        status: (b.last_seen?.speed || 0) > 0 ? "Running" : "Boarding",
        occupancy: b.occupancy_rate || "0/56",
        currentStop: b.route_name ? b.route_name.split('-')[0].trim() : "Terminal",
        conductor: b.conductor_name,
      }));
      dispatch(setActiveBuses(mapped));
      await storage.saveActiveBuses(mapped);
    } catch (err) {
      // Keep cached active buses
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadFleet();
    const interval = setInterval(loadFleet, 15000);
    return () => clearInterval(interval);
  }, [loadFleet]);


  const filtered = (buses ?? []).filter(
    (bus) =>
      (bus.busNumber ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (bus.routeName ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Other Bus Routes</Text>
      <Text style={styles.subtitle}>
        Track active fleet vehicles by bus number or route.
      </Text>

      {buses.length > 0 && (
        <TextInput
          placeholder="Search buses or routes"
          placeholderTextColor={colors.light.textMuted}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No active buses"
          subtitle="Fleet data will appear here once the backend pushes active bus records."
        />
      ) : (
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
      )}
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
