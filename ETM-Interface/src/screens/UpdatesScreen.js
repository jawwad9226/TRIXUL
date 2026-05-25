import React, { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  markUpdateComplete,
  refreshUpdates,
} from "../store/slices/updateSlice";
import { timeLabel } from "../utils/format";

export const UpdatesScreen = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.updates.items);

  useEffect(() => {
    dispatch(refreshUpdates());
  }, [dispatch]);

  return (
    <Screen>
      <Text style={styles.title}>Updates</Text>
      <Text style={styles.subtitle}>
        Announcements, route changes, admin replies and conductor tasks with
        unread badges.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
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
            <Pressable
              style={styles.taskButton}
              onPress={() => dispatch(markUpdateComplete(item.id))}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color="#fff"
              />
              <Text style={styles.taskText}>
                {item.completed ? "Completed" : "Mark task complete"}
              </Text>
            </Pressable>
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
