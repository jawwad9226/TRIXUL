import React, { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppCard } from "../components/AppCard";
import { MetricPill } from "../components/MetricPill";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  refreshActiveBuses,
  refreshBusStatus,
  refreshLocationFeed,
} from "../store/slices/busSlice";
import { refreshUpdates } from "../store/slices/updateSlice";
import { currency, percentage } from "../utils/format";

const cards = [
  {
    key: "Initializer",
    screen: "Initializer",
    icon: (
      <MaterialCommunityIcons
        name="account-check-outline"
        size={24}
        color="#fff"
      />
    ),
    subtitle: "Secure route setup before departure",
    accent: "#0f62fe",
  },
  {
    key: "Ticket Booking",
    screen: "TicketBooking",
    icon: (
      <MaterialCommunityIcons
        name="ticket-confirmation-outline"
        size={24}
        color="#fff"
      />
    ),
    subtitle: "Fast group fare calculation",
    accent: "#007a5a",
  },
  {
    key: "Current Bus Status",
    screen: "BusStatus",
    icon: <MaterialCommunityIcons name="bus-clock" size={24} color="#fff" />,
    subtitle: "Traffic, ETA and route condition",
    accent: "#5b5bd6",
  },
  {
    key: "Current Location",
    screen: "Location",
    icon: (
      <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#fff" />
    ),
    subtitle: "Live GPS and route movement",
    accent: "#d97706",
  },
  {
    key: "Other Bus Routes",
    screen: "OtherBusRoutes",
    icon: <MaterialCommunityIcons name="bus-multiple" size={24} color="#fff" />,
    subtitle: "Track active fleet operations",
    accent: "#0e7490",
  },
  {
    key: "Updates",
    screen: "Updates",
    icon: (
      <MaterialCommunityIcons
        name="bell-badge-outline"
        size={24}
        color="#fff"
      />
    ),
    subtitle: "Announcements and tasks",
    accent: "#8b5cf6",
  },
  {
    key: "Emergency Alert",
    screen: "EmergencyAlert",
    icon: (
      <MaterialCommunityIcons
        name="alert-octagon-outline"
        size={24}
        color="#fff"
      />
    ),
    subtitle: "Breakdown and incident reporting",
    accent: "#dc2626",
  },
  {
    key: "Ticket History",
    screen: "TicketHistory",
    icon: <MaterialCommunityIcons name="history" size={24} color="#fff" />,
    subtitle: "Saved tickets and audit trail",
    accent: "#334155",
  },
];

export const DashboardScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.conductor.profile);
  const route = useAppSelector((state) => state.route.route);
  const status = useAppSelector((state) => state.bus.status);
  const updates = useAppSelector((state) => state.updates.items);

  useEffect(() => {
    dispatch(refreshBusStatus());
    dispatch(refreshActiveBuses());
    dispatch(refreshLocationFeed());
    dispatch(refreshUpdates());
  }, [dispatch]);

  const columns = 2;

  return (
    <Screen>
      <View style={styles.hero}>
        <View>
          <Text style={styles.kicker}>Smart ETM Command Center</Text>
          <Text style={styles.title}>
            {profile?.conductorName ?? "Conductor"} on{" "}
            {route?.busNumber ?? "Bus"}
          </Text>
          <Text style={styles.subtitle}>
            {route?.routeName ?? "Loading route data"} •{" "}
            {profile?.shift ?? "Shift sync pending"}
          </Text>
        </View>
        <StatusBadge
          label={profile?.syncStatus?.toUpperCase() ?? "SYNCING"}
          tone={profile?.syncStatus === "online" ? "success" : "warning"}
        />
      </View>

      <View style={styles.metricsRow}>
        <MetricPill
          label="Updates"
          value={String(updates.length)}
          tone="primary"
        />
        <MetricPill
          label="Bus Occupancy"
          value={status ? percentage(55 + (status.progress % 35)) : "—"}
          tone="success"
        />
        <MetricPill
          label="Average Fare"
          value={currency(route?.baseFarePerKm ?? 0)}
          tone="warning"
        />
      </View>

      <SectionHeader title="Operations" />
      <FlatList
        data={cards}
        key="dashboard-grid"
        numColumns={columns}
        scrollEnabled={false}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={styles.cardGrid}
        renderItem={({ item }) => (
          <View style={styles.cardCell}>
            <AppCard
              title={item.key}
              subtitle={item.subtitle}
              accent={item.accent}
              icon={item.icon}
              onPress={() => navigation.navigate(item.screen)}
            />
          </View>
        )}
      />

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Live bus telemetry</Text>
        <Text style={styles.footerText}>
          {status?.currentStop ?? "Awaiting telemetry"} • ETA{" "}
          {status?.etaMinutes ?? "--"} mins • {status?.condition ?? "Clear"}
        </Text>
        <Pressable
          onPress={() => dispatch(refreshBusStatus())}
          style={styles.refreshButton}
        >
          <MaterialCommunityIcons name="sync" color="#fff" size={18} />
          <Text style={styles.refreshText}>Refresh feed</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  kicker: {
    color: colors.light.primary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
  },
  title: {
    color: colors.light.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 8,
  },
  subtitle: { color: colors.light.textMuted, marginTop: 6 },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
    marginBottom: spacing.lg,
  },
  cardGrid: {
    gap: spacing.md,
  },
  cardRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardCell: {
    flex: 1,
  },
  footerCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.light.secondary,
  },
  footerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  footerText: { color: "#e8efff", marginTop: spacing.sm },
  refreshButton: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ffffff24",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  refreshText: { color: "#fff", fontWeight: "700", marginLeft: 8 },
});
