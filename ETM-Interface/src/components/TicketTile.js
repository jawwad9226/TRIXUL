// File: src/components/TicketTile.js
// Purpose: Formats one saved ticket into a readable history card with reprint capabilities.
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii, spacing } from "../constants/theme";
import { currency, timeLabel } from "../utils/format";

export const TicketTile = ({ ticket, onReprint }) => {
  const handleReprint = () => {
    if (onReprint) {
      onReprint(ticket);
    } else {
      Alert.alert(
        "Reprint Slip",
        `Reprinting Ticket #${ticket.ticketId} for ${currency(ticket.fare)}...`
      );
    }
  };

  const isCash = (ticket.paymentMode || "").toLowerCase() === "cash";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.id}>#{ticket.ticketId}</Text>
          <Text style={styles.time}>{timeLabel(ticket.timestamp)}</Text>
        </View>
        <View style={[styles.payBadge, isCash ? styles.cashBadge : styles.upiBadge]}>
          <Text style={[styles.payBadgeText, isCash ? styles.cashBadgeText : styles.upiBadgeText]}>
            {isCash ? "CASH" : "UPI"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.routeRow}>
        <MaterialCommunityIcons name="bus" size={18} color={colors.light.primary} />
        <Text style={styles.routeText} numberOfLines={1}>
          {ticket.boardingStop} → {ticket.destinationStop}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareVal}>{currency(ticket.fare)}</Text>
        </View>

        <Pressable
          onPress={handleReprint}
          style={({ pressed }) => [
            styles.reprintBtn,
            pressed && { opacity: 0.8 },
          ]}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="printer-outline" size={16} color={colors.light.primary} />
          <Text style={styles.reprintText}>Reprint Slip</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  id: {
    color: colors.light.text,
    fontWeight: "900",
    fontSize: 15,
  },
  time: {
    color: colors.light.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  payBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  cashBadge: {
    backgroundColor: "#dcfce7",
  },
  cashBadgeText: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "800",
  },
  upiBadge: {
    backgroundColor: "#e0f2fe",
  },
  upiBadgeText: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: spacing.sm,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  routeText: {
    color: colors.light.text,
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  fareLabel: {
    fontSize: 11,
    color: colors.light.textMuted,
  },
  fareVal: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.light.text,
  },
  reprintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.light.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  reprintText: {
    color: colors.light.primary,
    fontWeight: "700",
    fontSize: 12,
  },
});
