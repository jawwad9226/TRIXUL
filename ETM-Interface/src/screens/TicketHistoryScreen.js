// File: src/screens/TicketHistoryScreen.js
// Purpose: Reads locally saved tickets and displays end-of-shift cash & UPI reconciliation.
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View, Pressable, useColorScheme } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { colors, radii, spacing } from "../constants/theme";
import { storage } from "../services/storage";
import { fetchShiftSummary } from "../services/api";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { hydrateHistory } from "../store/slices/ticketSlice";
import { TicketTile } from "../components/TicketTile";
import { currency } from "../utils/format";
import { PrintedTicketModal } from "../components/PrintedTicketModal";

export const TicketHistoryScreen = () => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const isDark = scheme === "dark";
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.conductor.profile);
  const route = useAppSelector((state) => state.route.currentRoute);
  const [history, setHistory] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [reprintModalTicket, setReprintModalTicket] = useState(null);

  const loadReconciliationData = async () => {
    setSyncing(true);
    try {
      // 1. Initial render from local cache
      const cached = await storage.loadTicketHistory([]);
      setHistory(cached);

      // 2. Fetch ground truth from PostgreSQL
      if (profile?.shiftId) {
        const remote = await fetchShiftSummary(profile.shiftId);
        if (remote?.tickets && remote.tickets.length > 0) {
          // Merge by unique ticketId
          const ticketMap = new Map();
          remote.tickets.forEach((t) => ticketMap.set(t.ticketId, t));
          cached.forEach((t) => {
            if (!ticketMap.has(t.ticketId)) {
              ticketMap.set(t.ticketId, t);
            }
          });
          const merged = Array.from(ticketMap.values()).sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          setHistory(merged);
          dispatch(hydrateHistory(merged));
          await storage.saveTicketHistory(merged);
        }
      }
    } catch (err) {
      // Offline fallback: keep cached tickets
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadReconciliationData();
  }, [profile?.shiftId]);


  // Compute shift reconciliation metrics
  const totalTickets = history.length;
  const totalRevenue = history.reduce((sum, t) => sum + (Number(t.fare) || 0), 0);
  const cashRevenue = history
    .filter((t) => (t.paymentMode || "").toLowerCase() === "cash")
    .reduce((sum, t) => sum + (Number(t.fare) || 0), 0);
  const upiRevenue = totalRevenue - cashRevenue;

  const handleReprint = (ticket) => {
    setReprintModalTicket({
      ...ticket,
      ticket_id: ticket.ticketId,
      source_stop: ticket.boardingStop,
      dest_stop: ticket.destinationStop,
      total_fare: ticket.fare,
      bus_number: profile?.busNumber || "MH-30-AB-1234",
      shift_id: profile?.shiftId || "Active Shift",
      conductor_name: profile?.conductorName || "Active Conductor",
      conductor_id: profile?.conductorId || "cond-1001",
      route_name: route?.route_name || "MSRTC State Route",
    });
  };

  return (
    <Screen showBack backTitle="Dashboard">
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? "#f8fafc" : colors.light.text }]}>Shift Summary & History</Text>
        <Text style={[styles.subtitle, { color: isDark ? "#94a3b8" : colors.light.textMuted }]}>
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
      <Text style={[styles.sectionHeader, { color: isDark ? "#f8fafc" : colors.light.text }]}>Issued Ticket Slips</Text>

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

      {/* Thermal Ticket Slip Modal (Item 4) */}
      <PrintedTicketModal
        visible={Boolean(reprintModalTicket)}
        ticket={reprintModalTicket}
        isReprint={true}
        onClose={() => setReprintModalTicket(null)}
      />
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
