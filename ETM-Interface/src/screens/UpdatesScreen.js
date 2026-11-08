import React, { useEffect, useState, useCallback } from "react";
import { FlatList, StyleSheet, Text, View, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUpdates, markUpdateComplete } from "../store/slices/updateSlice";
import { fetchActiveIncidents } from "../services/api";
import { storage } from "../services/storage";
import { timeLabel } from "../utils/format";

export const UpdatesScreen = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.updates.items);
  const [loading, setLoading] = useState(false);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchActiveIncidents();
      const rawIncidents = Array.isArray(data) ? data : [];
      const mapped = rawIncidents.map((inc) => ({
        id: inc.incident_id,
        title: `[${inc.severity}] Bus ${inc.bus_number || "Grid Alert"} • ${inc.route_name || "Operational Sector"}`,
        body: inc.message,
        priority: inc.severity === "SOS" ? "High" : inc.severity === "WARNING" ? "Medium" : "Low",
        category: inc.status === "OPEN" ? "Active Dispatch" : "Acknowledged Log",
        timestamp: inc.timestamp,
        unread: inc.status === "OPEN",
        completed: inc.status !== "OPEN",
      }));
      dispatch(setUpdates(mapped));
      await storage.saveUpdates(mapped);
    } catch (err) {
      // Keep cached updates
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 15000);
    return () => clearInterval(interval);
  }, [loadIncidents]);


  return (
    <Screen showBack backTitle="Dashboard" scroll={false}>
      <Text style={styles.title}>Updates</Text>
      <Text style={styles.subtitle}>
        Announcements, route changes, admin replies and conductor tasks.
      </Text>

      {items.length === 0 ? (
        <EmptyState
          title="No updates yet"
          subtitle="Updates from the dispatch system will appear here once the backend pushes them."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardBody}>{item.body}</Text>
                </View>
                {item.unread ? <View style={styles.unreadDot} /> : null}
              </View>
              <View style={styles.metaRow}>
                <StatusBadge
                  label={item.priority}
                  tone={
                    item.priority === "High"
                      ? "danger"
                      : item.priority === "Medium"
                        ? "warning"
                        : "info"
                  }
                />
                <StatusBadge label={item.category} tone="info" />
                <Text style={styles.time}>{timeLabel(item.timestamp)}</Text>
              </View>
              <View
                style={styles.taskButton}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => dispatch(markUpdateComplete(item.id))}
              >
                <MaterialCommunityIcons
                  name={item.completed ? "check-circle" : "check-circle-outline"}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.taskText}>
                  {item.completed ? "Completed" : "Mark task complete"}
                </Text>
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
  cardTitle: { color: colors.light.text, fontWeight: "900", fontSize: 18 },
  cardBody: { color: colors.light.textMuted, marginTop: 6, lineHeight: 20 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.danger,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.md,
  },
  time: { color: colors.light.textMuted, fontSize: 12 },
  taskButton: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.secondary,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  taskText: { color: "#fff", fontWeight: "800", marginLeft: 8 },
});
