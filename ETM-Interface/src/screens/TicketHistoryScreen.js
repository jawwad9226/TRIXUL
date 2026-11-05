// File: src/screens/TicketHistoryScreen.js
// Purpose: Reads locally saved tickets and displays end-of-shift cash & UPI reconciliation.
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { colors, radii, spacing } from "../constants/theme";
import { storage } from "../services/storage";
import { TicketTile } from "../components/TicketTile";
import { currency } from "../utils/format";

export const TicketHistoryScreen = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    storage
      .loadTicketHistory([])
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  // Compute shift reconciliation metrics
  const totalTickets = history.length;
  const totalRevenue = history.reduce((sum, t) => sum + (Number(t.fare) || 0), 0);
  const cashRevenue = history
    .filter((t) => (t.paymentMode || "").toLowerCase() === "cash")
    .reduce((sum, t) => sum + (Number(t.fare) || 0), 0);
  const upiRevenue = totalRevenue - cashRevenue;

  const handleReprint = (ticket) => {
    Alert.alert(
      "Duplicate Slip Generated",
      `Ticket #${ticket.ticketId}\nAmount: ${currency(ticket.fare)}\nRoute: ${ticket.boardingStop} → ${ticket.destinationStop}\nSlip reprinted.`
    );
  };

  return (
    <Screen showBack backTitle="Dashboard">
      <View style={styles.header}>
        <Text style={styles.title}>Shift Summary & History</Text>
        <Text style={styles.subtitle}>
          Cash and UPI reconciliation for depot checkout and ticket reprint
        </Text>
      </View>

      {/* End-of-Shift Reconciliation Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>End-of-Shift Collection</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalTickets} Tickets</Text>
          </View>
        </View>

        <Text style={styles.totalRevenueVal}>{currency(totalRevenue)}</Text>
        <Text style={styles.totalRevenueSub}>Total Net Collected on Current Shift</Text>

        <View style={styles.splitRow}>
          <View style={styles.splitCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialCommunityIcons name="cash" size={16} color="#15803d" />
              <Text style={styles.splitLabel}>Cash in Hand</Text>
            </View>
            <Text style={[styles.splitVal, { color: "#15803d" }]}>
              {currency(cashRevenue)}
            </Text>
          </View>

          <View style={styles.splitCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialCommunityIcons name="qrcode" size={16} color="#0369a1" />
              <Text style={styles.splitLabel}>UPI / Online</Text>
            </View>
            <Text style={[styles.splitVal, { color: "#0369a1" }]}>
              {currency(upiRevenue)}
            </Text>
          </View>
        </View>
      </View>

      {/* Ticket Logs List */}
      <Text style={styles.sectionHeader}>Issued Ticket Slips</Text>

      {history.length ? (
        <FlatList
          data={history}
          keyExtractor={(item) => item.ticketId}
          style={styles.list}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TicketTile ticket={item} onReprint={handleReprint} />
          )}
        />
      ) : (
        <EmptyState
          title="No tickets issued yet"
          subtitle="Tickets booked on this shift will appear here with instant reprint and audit capability."
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  title: {
    color: colors.light.text,
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.light.textMuted,
    marginTop: 4,
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: "#0b1f33",
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    color: "#93a6bd",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: "#1e3a5f",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  countBadgeText: {
    color: "#7dd3fc",
    fontWeight: "800",
    fontSize: 11,
  },
  totalRevenueVal: {
    color: "#4ade80",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
  },
  totalRevenueSub: {
    color: "#93a6bd",
    fontSize: 12,
    marginTop: 2,
  },
  splitRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  splitCard: {
    flex: 1,
    backgroundColor: "#13253d",
    padding: spacing.md,
    borderRadius: radii.md,
  },
  splitLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  splitVal: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.light.text,
    marginBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
});
