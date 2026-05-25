import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, TextInput } from "react-native";

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
import { bootstrapRoute } from "../store/slices/routeSlice";
import { currency } from "../utils/format";
import {
  mockApi,
  lastMockDataSource,
  lastMockDataTime,
} from "../services/mockApi";
import { storage } from "../services/storage";
import { setRoute, setRefreshRequired } from "../store/slices/routeSlice";

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
  const refreshRequired = useAppSelector(
    (state) => state.route.refreshRequired,
  );
  const status = useAppSelector((state) => state.bus.status);
  const updates = useAppSelector((state) => state.updates.items);
  const [loading, setLoading] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [apiHost, setApiHost] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [diagSource, setDiagSource] = useState(null);

  useEffect(() => {
    dispatch(refreshBusStatus());
    dispatch(refreshActiveBuses());
    dispatch(refreshLocationFeed());
    dispatch(refreshUpdates());
  }, [dispatch]);

  useEffect(() => {
    if (!route && !refreshRequired) {
      // ensure we have route data cached or fetched from API
      dispatch(bootstrapRoute());
    }
  }, [dispatch, route, refreshRequired]);

  useEffect(() => {
    if (refreshRequired && !route) {
      setLoading(true);
      return;
    }

    // consider data ready when we have a profile and at least basic route info
    const hasProfile = !!profile && Object.keys(profile).length > 0;
    const hasRouteInfo =
      !!route &&
      (route.routeName ||
        route.busNumber ||
        (route.stops && route.stops.length > 0));
    if (hasProfile && hasRouteInfo) {
      setLoading(false);
      return;
    }

    // safety: don't keep loading indefinitely
    const fallback = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(fallback);
  }, [profile, route]);

  const columns = 2;

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
            renderItem={({ item }) => (
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
              label="Live Speed"
              value={
                status?.speed != null ? `${status.speed.toFixed(1)} m/s` : "—"
              }
              tone="success"
            />
            <MetricPill
              label="Sample Fare"
              value={currency(route?.fareTable?.[0]?.price ?? 0)}
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
            <Pressable
              onPress={async () => {
                setLoading(true);
                try {
                  console.log("Dashboard: user triggered live data sync");
                  await mockApi.reloadMock();
                  await dispatch(bootstrapRoute({ forceRemote: true }));
                  dispatch(refreshBusStatus());
                  dispatch(refreshActiveBuses());
                  dispatch(refreshLocationFeed());
                  dispatch(refreshUpdates());
                } catch (e) {
                  console.log("Dashboard: refresh failed", e && e.message);
                } finally {
                  setLoading(false);
                }
              }}
              style={[styles.refreshButton, { marginLeft: 12 }]}
            >
              <MaterialCommunityIcons name="refresh" color="#fff" size={18} />
              <Text style={styles.refreshText}>Refresh Data</Text>
            </Pressable>
            <Pressable
              onPress={async () => setDevOpen(true)}
              style={[styles.refreshButton, { marginLeft: 12 }]}
            >
              <MaterialCommunityIcons name="wrench" color="#fff" size={18} />
              <Text style={styles.refreshText}>Dev</Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal visible={devOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
          <View
            style={{ backgroundColor: "#fff", borderRadius: 8, padding: 16 }}
          >
            <Text style={{ fontWeight: "800", marginBottom: 8 }}>
              Developer Tools
            </Text>
            <TextInput
              value={apiHost}
              onChangeText={setApiHost}
              placeholder="API base URL override (e.g. http://192.168.1.100:3000)"
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                padding: 8,
                marginBottom: 8,
              }}
            />
            <Pressable
              onPress={async () => {
                try {
                  await storage.saveApiBaseUrl(apiHost || null);
                  setTestResult("Saved override");
                } catch (e) {
                  setTestResult("Save failed: " + (e && e.message));
                }
              }}
              style={[styles.refreshButton, { alignSelf: "flex-start" }]}
            >
              <Text style={styles.refreshText}>Save Host</Text>
            </Pressable>

            <View style={{ height: 12 }} />
            <Pressable
              onPress={async () => {
                setTestResult("Testing...");
                const started = Date.now();
                try {
                  await mockApi.reloadMock();
                  const ms = Date.now() - started;
                  setDiagSource(lastMockDataSource + " @ " + lastMockDataTime);
                  setTestResult(`OK (${ms}ms) - source ${lastMockDataSource}`);
                } catch (e) {
                  setTestResult("Test failed: " + (e && e.message));
                }
              }}
              style={[styles.refreshButton, { alignSelf: "flex-start" }]}
            >
              <Text style={styles.refreshText}>Test Connectivity</Text>
            </Pressable>

            <View style={{ height: 12 }} />
            <Pressable
              onPress={async () => {
                // simulate initializer flow: clear cache and force refresh on next boot
                try {
                  await mockApi.clearMockCache();
                  dispatch(setRefreshRequired(true));
                  dispatch(setRoute(null));
                  setTestResult("Initializer cache cleared");
                } catch (e) {
                  setTestResult("Failed: " + (e && e.message));
                }
              }}
              style={[styles.refreshButton, { alignSelf: "flex-start" }]}
            >
              <Text style={styles.refreshText}>Run Initializer Flow</Text>
            </Pressable>

            <View style={{ height: 12 }} />
            <Text>{testResult}</Text>
            <View style={{ height: 12 }} />
            <Pressable
              onPress={() => setDevOpen(false)}
              style={[styles.refreshButton, { alignSelf: "flex-end" }]}
            >
              <Text style={styles.refreshText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
