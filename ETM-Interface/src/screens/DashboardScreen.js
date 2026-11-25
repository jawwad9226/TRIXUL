import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppCard } from "../components/AppCard";
import { MetricPill } from "../components/MetricPill";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
<<<<<<< HEAD
import {
  refreshActiveBuses,
  refreshBusStatus,
  refreshLocationFeed,
} from "../store/slices/busSlice";
import { refreshUpdates } from "../store/slices/updateSlice";
import {
  bootstrapRoute,
  setRoute,
  setRefreshRequired,
} from "../store/slices/routeSlice";
import { currency } from "../utils/format";
import {
  lastMockDataSource,
  lastMockDataTime,
  mockApi,
} from "../services/mockApi";
=======
import { setBusStatus, setBusLoading, setBusError } from "../store/slices/busSlice";
import { updateBusAssignment } from "../store/slices/conductorSlice";
import { sendHeartbeat, batchSyncTickets } from "../services/api";
>>>>>>> origin/main
import { storage } from "../services/storage";

const cards = [
  {
    key: "Ticket Booking",
    screen: "TicketBooking",
    icon: (
      <MaterialCommunityIcons
        name="ticket-confirmation"
        size={28}
        color="#fff"
      />
    ),
    subtitle: "Fast single & group ticketing",
    accent: "#007a5a",
  },
  {
    key: "Trip & GPS Status",
    screen: "BusStatus",
    icon: (
      <MaterialCommunityIcons
        name="bus-clock"
        size={28}
        color="#fff"
      />
    ),
    subtitle: "Live route timeline & telemetry",
    accent: "#0f62fe",
  },
  {
    key: "Shift & Tickets",
    screen: "TicketHistory",
    icon: (
      <MaterialCommunityIcons
        name="history"
        size={28}
        color="#fff"
      />
    ),
    subtitle: "Cash/UPI summary & reprint",
    accent: "#334155",
  },
  {
    key: "Emergency Alert",
    screen: "EmergencyAlert",
    icon: (
      <MaterialCommunityIcons
        name="alert-octagon"
        size={28}
        color="#fff"
      />
    ),
    subtitle: "Breakdown & SOS incident log",
    accent: "#dc2626",
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
<<<<<<< HEAD
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
      dispatch(bootstrapRoute());
    }
  }, [dispatch, route, refreshRequired]);

  useEffect(() => {
    if (refreshRequired && !route) {
      setLoading(true);
      return;
    }

    const hasProfile = Boolean(profile && Object.keys(profile).length > 0);
    const hasRouteInfo = Boolean(
      route &&
      (route.routeName ||
        route.busNumber ||
        (route.stops && route.stops.length > 0)),
    );

    if (hasProfile && hasRouteInfo) {
      setLoading(false);
      return;
    }

    const fallback = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(fallback);
  }, [profile, route, refreshRequired]);

  const columns = 2;

  const header = loading ? (
    <>
      <View style={[styles.hero, styles.skeletonBox]} />
      <View style={styles.metricsRow}>
        <View style={styles.skeletonPill} />
        <View style={styles.skeletonPill} />
        <View style={styles.skeletonPill} />
      </View>
      <SectionHeader title="Operations" />
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
          value={status?.speed != null ? `${status.speed.toFixed(1)} m/s` : "—"}
          tone="success"
        />
        <MetricPill
          label="Sample Fare"
          value={currency(route?.fareTable?.[0]?.price ?? 0)}
          tone="warning"
        />
      </View>

      <SectionHeader title="Operations" />
    </>
  );

  const footer = loading ? (
    <View style={[styles.footerCard, styles.skeletonBox]} />
  ) : (
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
          } catch (error) {
            console.log("Dashboard: refresh failed", error && error.message);
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
        onPress={() => setDevOpen(true)}
        style={[styles.refreshButton, { marginLeft: 12 }]}
      >
        <MaterialCommunityIcons name="wrench" color="#fff" size={18} />
        <Text style={styles.refreshText}>Dev</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.key}
        numColumns={columns}
        contentContainerStyle={styles.dashboardList}
        columnWrapperStyle={styles.cardRow}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item }) => (
          <View style={styles.cardCell}>
            {loading ? (
              <View style={styles.skeletonCard} />
            ) : (
              <AppCard
                title={item.key}
                subtitle={item.subtitle}
                accent={item.accent}
                icon={item.icon}
                onPress={() => navigation.navigate(item.screen)}
              />
            )}
    </Screen>
  );
};
=======
  const history = useAppSelector((state) => state.ticket.history || []);
  const loadingBus = useAppSelector((state) => state.bus.loading);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Background Auto-sync of Offline Tickets when connected
  const syncOfflineQueue = async () => {
    try {
      const offlineTickets = await storage.loadOfflineTickets();
      if (offlineTickets && offlineTickets.length > 0 && profile?.shiftId) {
        await batchSyncTickets({
          shift_id: profile.shiftId,
          tickets: offlineTickets,
        });
        await storage.clearOfflineTickets();
      }
      setIsOnline(true);
    } catch (err) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    if (profile && route) {
      setLoading(false);
    } else {
      const fallback = setTimeout(() => setLoading(false), 1500);
>>>>>>> origin/main
      return () => clearTimeout(fallback);
    }
  }, [profile, route]);

  useEffect(() => {
    syncOfflineQueue();
    const interval = setInterval(syncOfflineQueue, 20000);
    return () => clearInterval(interval);
  }, [profile?.shiftId]);

  // Pure Live Passenger Occupancy Calculation from Real Database Records
  const bookedPassengers = history.reduce((acc, t) => {
    const c = t.passengerCounts || {};
    const sum = (c.women || 0) + (c.seniors || 0) + (c.children || 0) + (c.adultMale || 0);
    return acc + (sum > 0 ? sum : (t.passengerCount || 1));
  }, 0);
  const totalCapacity = route?.capacity_total || 56;
  const currentOccupancy = bookedPassengers;

  const occupancyTone =
    currentOccupancy > totalCapacity
      ? "danger"
      : currentOccupancy >= 45
        ? "warning"
        : "success";

  const occupancyLabel =
    currentOccupancy > totalCapacity
      ? `${currentOccupancy}/${totalCapacity} Overload`
      : currentOccupancy >= 45
        ? `${currentOccupancy}/${totalCapacity} Standing`
        : `${currentOccupancy}/${totalCapacity} Seated`;

  const handleSendTelemetry = async () => {
    dispatch(setBusLoading(true));
    try {
      let lat = route?.stops?.[0]?.latitude || 20.7002;
      let lng = route?.stops?.[0]?.longitude || 77.0022;
      let spd = 38.5;

      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
          spd = loc.coords.speed || 38.5;
        }
      } catch (locErr) {
        // Fallback to route station coordinates if GPS hardware is unavailable
      }

      const payload = {
        shift_id: profile?.shiftId || profile?.shift || "shift-001",
        latitude: lat,
        longitude: lng,
        speed: spd,
        timestamp: new Date().toISOString(),
      };

      const response = await sendHeartbeat(payload);
      setIsOnline(true);

      // Mid-Shift Bus Swap Detection
      if (response?.bus_number && response.bus_number !== profile?.busNumber) {
        dispatch(updateBusAssignment({
          busNumber: response.bus_number,
          busId: response.bus_id
        }));
      }

      dispatch(setBusStatus({
        current_stop: response?.current_stop || route?.stops?.[0]?.name || "Akola Bus Stand",
        next_stop: response?.next_stop || route?.stops?.[1]?.name || "Shegaon",
        eta_minutes: response?.eta_minutes || 8,
        condition: response?.condition || "Moving (Clear)",
        speed: payload.speed,
      }));

      Alert.alert("Telemetry Synced", `Live GPS reported to dispatch. Bus: ${response?.bus_number || profile?.busNumber || "Active"}`);
    } catch (error) {
      setIsOnline(false);
      dispatch(setBusError(error.message));
      Alert.alert("Telemetry Notice", "GPS saved locally. Dispatch sync will retry when online.");
    } finally {
      dispatch(setBusLoading(false));
    }
  };

  const handleEndShift = () => {
    Alert.alert(
      "Shift Management",
      "Do you want to re-link route data or switch conductor shift?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Re-link Route / Shift",
          onPress: () => navigation.navigate("Initializer"),
        },
      ]
    );
  };

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
          <View style={styles.cardGrid}>
            <View style={styles.cardRow}>
              <View style={[styles.skeletonCard, styles.cardCell]} />
              <View style={[styles.skeletonCard, styles.cardCell]} />
            </View>
            <View style={styles.cardRow}>
              <View style={[styles.skeletonCard, styles.cardCell]} />
              <View style={[styles.skeletonCard, styles.cardCell]} />
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Header Card */}
          <View style={styles.hero}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.kicker}>Smart ETM Command Center</Text>
              <Text style={styles.title}>
                {profile?.conductorName || "Active Conductor"}
              </Text>
              <Text style={styles.subtitle}>
                {route?.route_name || "Route In Transit"}
              </Text>
              <Text style={styles.shiftTag}>
                Bus: {profile?.busNumber || route?.busNumber || "Standby"} • Shift: {profile?.shiftId || "Active"}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <StatusBadge
                label={isOnline ? "ONLINE" : "OFFLINE (CACHED)"}
                tone={isOnline ? "success" : "warning"}
              />
              <Pressable
                onPress={() => navigation.navigate("Updates")}
                style={styles.bellButton}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={20}
                  color={colors.light.text}
                />
              </Pressable>
            </View>
          </View>
<<<<<<< HEAD
        )}
      />
    </Screen>
  );
};
=======

          {/* Top Metrics Row (Occupancy, Next Stop, Live Speed) */}
          <View style={styles.metricsRow}>
>>>>>>> origin/main
            <MetricPill
              label="Occupancy"
              value={occupancyLabel}
              tone={occupancyTone}
            />
            <MetricPill
              label="Next Stop"
              value={status?.next_stop ?? (route?.stops?.[1]?.name || "Shegaon")}
              tone="primary"
            />
            <MetricPill
              label="Live Speed"
              value={
                status?.speed != null
                  ? `${Math.round(status.speed > 10 ? status.speed : status.speed * 3.6)} km/h`
                  : "38 km/h"
              }
              tone="info"
            />
          </View>

          {/* Operations Section */}
          <SectionHeader title="Operations" />
          <FlatList
            data={cards}
            key="dashboard-grid-4"
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

          {/* Bottom Bar: Sync Telemetry & End Shift / Re-link */}
          <View style={styles.bottomBar}>
            <Pressable
              onPress={handleSendTelemetry}
              style={[styles.bottomBtn, styles.syncBtn]}
              disabled={loadingBus}
            >
              <MaterialCommunityIcons
                name="sync"
                size={18}
                color={colors.light.primary}
              />
              <Text style={styles.syncBtnText}>
                {loadingBus ? "Syncing..." : "Sync Telemetry"}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleEndShift}
              style={[styles.bottomBtn, styles.relinkBtn]}
            >
              <MaterialCommunityIcons
                name="logout-variant"
                size={18}
                color={colors.light.textMuted}
              />
              <Text style={styles.relinkBtnText}>End Shift / Re-link</Text>
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
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  bellButton: {
    backgroundColor: colors.light.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginTop: 4,
  },
  kicker: {
    color: colors.light.primary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 11,
  },
  title: {
    color: colors.light.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: colors.light.text,
    fontWeight: "600",
    marginTop: 4,
    fontSize: 14,
  },
  shiftTag: {
    color: colors.light.textMuted,
    marginTop: 4,
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cardGrid: {
    marginTop: spacing.sm,
  },
  cardRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardCell: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.md,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  syncBtn: {
    backgroundColor: colors.light.primarySoft,
    borderColor: colors.light.primary,
  },
  syncBtnText: {
    color: colors.light.primary,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
  relinkBtn: {
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
  },
  relinkBtnText: {
    color: colors.light.textMuted,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
  skeletonBox: {
    backgroundColor: "#e6e9ee",
    height: 110,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
  },
  skeletonPill: {
    backgroundColor: "#eef2f6",
    height: 48,
    flex: 1,
    borderRadius: radii.md,
  },
  skeletonCard: {
    backgroundColor: "#eef2f6",
    height: 110,
    borderRadius: radii.md,
  },
});
