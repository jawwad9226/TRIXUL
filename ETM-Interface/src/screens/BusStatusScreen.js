<<<<<<< HEAD
// File: src/screens/BusStatusScreen.js
// Purpose: Shows live bus telemetry in a read-only status view.
// Imports: bus state and refresh action.
// Behavior: Mounting the screen triggers a refresh loop while the view is open.
import React, { useEffect } from "react";
=======
import React from "react";
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ProgressBar } from "../components/ProgressBar";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
<<<<<<< HEAD
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { refreshBusStatus } from "../store/slices/busSlice";
import { percentage } from "../utils/format";

export const BusStatusScreen = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.bus.status);

  useEffect(() => {
    // Refresh the live status now and then keep it current while the screen is open.
    dispatch(refreshBusStatus());
    const timer = setInterval(() => dispatch(refreshBusStatus()), 9000);
    return () => clearInterval(timer);
  }, [dispatch]);

=======
import { useAppSelector } from "../store/hooks";
import { percentage } from "../utils/format";

export const BusStatusScreen = () => {
  // Status is populated in Redux when the conductor sends live telemetry
  // from the Dashboard. No polling needed — it reflects the last heartbeat.
  const status = useAppSelector((state) => state.bus.status);

>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Current Bus Status</Text>
          <Text style={styles.subtitle}>
            Live telemetry derived from the latest GPS report and backend route
            state.
          </Text>
        </View>
        <StatusBadge
<<<<<<< HEAD
          label={status?.condition ?? "SYNCING"}
          tone={
            // Zero-speed buses should be shown as stationary, not failing.
=======
          label={status?.condition ?? "AWAITING"}
          tone={
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
            status?.condition === "Moving"
              ? "success"
              : status?.condition === "Stationary"
                ? "warning"
<<<<<<< HEAD
                : "warning"
=======
                : "info"
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
          }
        />
      </View>

<<<<<<< HEAD
      <View style={styles.card}>
        {/* Show the backend-derived bus summary that the dispatcher cares about. */}
        <View style={styles.row}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{status?.currentStop ?? "—"}</Text>
            <Text style={styles.metricLabel}>Current stop</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{status?.nextStop ?? "—"}</Text>
            <Text style={styles.metricLabel}>Next stop</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {status?.etaMinutes ?? "--"} min
            </Text>
            <Text style={styles.metricLabel}>ETA</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {status?.speed != null ? `${status.speed.toFixed(1)} m/s` : "—"}
            </Text>
            <Text style={styles.metricLabel}>Current speed</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {percentage(status?.progress ?? 0)}
            </Text>
            <Text style={styles.metricLabel}>Route progress</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{status?.condition ?? "—"}</Text>
            <Text style={styles.metricLabel}>Telemetry state</Text>
          </View>
        </View>
        <View style={styles.progressBlock}>
          <Text style={styles.label}>Route progress visualization</Text>
          <ProgressBar progress={status?.progress ?? 0} />
        </View>
        <View style={styles.trafficCard}>
          <MaterialCommunityIcons
            name="traffic-light"
            size={28}
            color={colors.light.primary}
          />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.trafficTitle}>
              {status?.condition ?? "Stationary"}
            </Text>
            <Text style={styles.trafficText}>
              Conditions are derived from the last location sent by the bus.
            </Text>
          </View>
        </View>
      </View>
=======
      {!status ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons
            name="bus-clock"
            size={48}
            color={colors.light.textMuted}
          />
          <Text style={styles.emptyTitle}>No telemetry yet</Text>
          <Text style={styles.emptySubtitle}>
            Go to the Dashboard and press "Send Live Telemetry" to populate
            this screen with real data from the backend.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.metric}>
              {/* Backend returns snake_case: current_stop */}
              <Text style={styles.metricValue}>{status.current_stop ?? "—"}</Text>
              <Text style={styles.metricLabel}>Current stop</Text>
            </View>
            <View style={styles.metric}>
              {/* Backend returns snake_case: next_stop */}
              <Text style={styles.metricValue}>{status.next_stop ?? "—"}</Text>
              <Text style={styles.metricLabel}>Next stop</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.metric}>
              {/* Backend returns snake_case: eta_minutes */}
              <Text style={styles.metricValue}>
                {status.eta_minutes ?? "--"} min
              </Text>
              <Text style={styles.metricLabel}>ETA to next stop</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {status.speed != null ? `${Number(status.speed).toFixed(1)} km/h` : "—"}
              </Text>
              <Text style={styles.metricLabel}>Current speed</Text>
            </View>
          </View>
          <View style={styles.trafficCard}>
            <MaterialCommunityIcons
              name="traffic-light"
              size={28}
              color={colors.light.primary}
            />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.trafficTitle}>
                {status.condition ?? "Stationary"}
              </Text>
              <Text style={styles.trafficText}>
                Conditions are derived from the last location sent by the bus.
              </Text>
            </View>
          </View>
        </View>
      )}
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: { color: colors.light.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.light.textMuted, marginTop: 6, maxWidth: 680 },
<<<<<<< HEAD
=======
  emptyCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  emptyTitle: { color: colors.light.text, fontWeight: "800", fontSize: 18 },
  emptySubtitle: {
    color: colors.light.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    flexWrap: "wrap",
  },
  metric: {
    flex: 1,
    minWidth: 140,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.light.surfaceAlt,
  },
  metricValue: { color: colors.light.text, fontSize: 20, fontWeight: "900" },
  metricLabel: { color: colors.light.textMuted, marginTop: 6 },
<<<<<<< HEAD
  progressBlock: { marginVertical: spacing.lg },
  label: { color: colors.light.text, marginBottom: 8, fontWeight: "700" },
=======
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  trafficCard: {
    flexDirection: "row",
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: "#eef4ff",
    alignItems: "center",
<<<<<<< HEAD
=======
    marginTop: spacing.md,
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  },
  trafficTitle: { color: colors.light.text, fontWeight: "800" },
  trafficText: { color: colors.light.textMuted, marginTop: 4 },
});
