import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { AppCard } from "../components/AppCard";
import { MetricPill } from "../components/MetricPill";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setBusStatus, setBusLoading, setBusError } from "../store/slices/busSlice";
import { currency } from "../utils/format";
import { sendHeartbeat } from "../services/api";

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
  const loadingBus = useAppSelector((state) => state.bus.loading);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic loading logic based on route/profile existence
    if (profile && route) {
      setLoading(false);
    } else {
      const fallback = setTimeout(() => setLoading(false), 3000);
      return () => clearTimeout(fallback);
    }
  }, [profile, route]);

  const columns = 2;

  const handleSendTelemetry = async () => {
    dispatch(setBusLoading(true));
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      const payload = {
        shift_id: profile?.shiftId || profile?.shift || "shift-001",
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speed: location.coords.speed || 0,
        timestamp: new Date().toISOString(),
      };
      
      const response = await sendHeartbeat(payload);
      
      if (response && response.status === "success") {
        dispatch(setBusStatus({
          current_stop: response.current_stop,
          next_stop: response.next_stop,
          eta_minutes: response.eta_minutes,
          condition: response.condition,
          speed: payload.speed
        }));
      }
    } catch (error) {
      dispatch(setBusError(error.message));
      Alert.alert("Telemetry Error", error.message);
    } finally {
      dispatch(setBusLoading(false));
    }
  };

  return (
    <Screen>
      {loading ? (
        <>
          <View style={[styles.hero, styles.skeletonBox]} />
          <View style={styles.metricsRow}>
            <View style={[styles.skeletonPill]} />
            <View style={[styles.skeletonPill]} />
            <View style={[styles.skeletonPill]} />
          </View>
          <SectionHeader title="Operations" />
          <FlatList
            data={cards}
            key="dashboard-grid"
            numColumns={columns}
            scrollEnabled={false}
            columnWrapperStyle={styles.cardRow}
            contentContainerStyle={styles.cardGrid}
            renderItem={() => (
              <View style={styles.cardCell}>
                <View style={[styles.skeletonCard]} />
              </View>
            )}
          />
          <View style={[styles.footerCard, styles.skeletonBox]} />
        </>
      ) : (
        <>
          <View style={styles.hero}>
            <View>
              <Text style={styles.kicker}>Smart ETM Command Center</Text>
              <Text style={styles.title}>
                {profile?.conductorName ?? "Conductor"} on{" "}
                {route?.busNumber ?? "Bus"}
              </Text>
              <Text style={styles.subtitle}>
                {route?.route_name ?? "Live Route Enabled"} •{" "}
                {profile?.shift ?? "Active Shift"}
              </Text>
            </View>
            <StatusBadge label="ONLINE" tone="success" />
          </View>
        )}
      />

          <View style={styles.metricsRow}>
            <MetricPill
              label="Live Speed"
              value={
                status?.speed != null ? `${status.speed.toFixed(1)} m/s` : "—"
              }
              tone="success"
            />
            <MetricPill
              label="Next Stop"
              value={status?.next_stop ?? "Unknown"}
              tone="primary"
            />
            <MetricPill
              label="Sample Fare"
              value={currency(route?.fares?.[0]?.price ?? 0)}
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
              {status?.current_stop ?? "Awaiting telemetry"} • ETA{" "}
              {status?.eta_minutes ?? "--"} mins • {status?.condition ?? "Clear"}
            </Text>
            
            <Pressable
              onPress={handleSendTelemetry}
              style={styles.refreshButton}
              disabled={loadingBus}
            >
              <MaterialCommunityIcons name="crosshairs-gps" color="#fff" size={18} />
              <Text style={styles.refreshText}>
                {loadingBus ? "Sending..." : "Send Live Telemetry"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
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
  dashboardList: {
    paddingBottom: spacing.xl,
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
  skeletonBox: {
    backgroundColor: "#e6e9ee",
    height: 110,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
  },
  skeletonPill: {
    backgroundColor: "#eef2f6",
    height: 44,
    flex: 1,
    borderRadius: radii.md,
  },
  skeletonCard: {
    backgroundColor: "#eef2f6",
    height: 86,
    borderRadius: radii.md,
  },
});
