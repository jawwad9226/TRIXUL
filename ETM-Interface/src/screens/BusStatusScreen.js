import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ProgressBar } from "../components/ProgressBar";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppSelector } from "../store/hooks";
import { percentage } from "../utils/format";

export const BusStatusScreen = () => {
  // Status is populated in Redux when the conductor sends live telemetry
  // from the Dashboard. No polling needed — it reflects the last heartbeat.
  const status = useAppSelector((state) => state.bus.status);

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
          label={status?.condition ?? "AWAITING"}
          tone={
            status?.condition === "Moving"
              ? "success"
              : status?.condition === "Stationary"
                ? "warning"
                : "info"
          }
        />
      </View>

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
  trafficCard: {
    flexDirection: "row",
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: "#eef4ff",
    alignItems: "center",
    marginTop: spacing.md,
  },
  trafficTitle: { color: colors.light.text, fontWeight: "800" },
  trafficText: { color: colors.light.textMuted, marginTop: 4 },
});
