// File: src/screens/TicketBookingScreen.js
// Purpose: Collects passenger details, calculates fare, and stores ticket history.
// Features: Smart 'From' chips (Previous/Current/Next), thumb-friendly +/- steppers, admin-managed Yojana concessions.
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { storage } from "../services/storage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearBookingStops,
  hydrateHistory,
  setPaymentMode,
  submitBooking,
  updateDraft,
  updatePassengerCounts,
  verifyOnlinePayment,
} from "../store/slices/ticketSlice";
import { issueTicket } from "../services/api";
import { calculateFare, totalPassengers } from "../utils/fare";
import { currency, timeLabel } from "../utils/format";
import { PrintedTicketModal } from "../components/PrintedTicketModal";

export const TicketBookingScreen = () => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const isDark = scheme === "dark";
  const theme = colors[scheme];
  const dispatch = useAppDispatch();
  const route = useAppSelector((state) => state.route.route);
  const stops = route?.stops ?? [];
  const draft = useAppSelector((state) => state.ticket.draft);
  const paymentStatus = useAppSelector((state) => state.ticket.paymentStatus);
  const bookingStatus = useAppSelector((state) => state.ticket.bookingStatus);
  const currentTicket = useAppSelector((state) => state.ticket.currentTicket);
  const bookingError = useAppSelector((state) => state.ticket.bookingError);
  const profile = useAppSelector((state) => state.conductor.profile);
  const [isIssuing, setIsIssuing] = useState(false);
  const [printedTicketSlip, setPrintedTicketSlip] = useState(null);

  // Active Yojana concessions (admin-managed configuration)
  const activeYojnas = route?.activeYojnas ?? {
    mahilaSanman: true, // 50% discount for female passengers (Government scheme)
    seniorCitizen: true, // 100% concession for senior citizens (75+)
    childConcession: true, // 50% half-ticket for children (5-12 years)
  };

  useEffect(() => {
    storage
      .loadTicketHistory([])
      .then((history) => dispatch(hydrateHistory(history)))
      .catch(() => null);

    // Default boarding stop to first or second stop if not set
    if (!draft.boardingStop && stops.length > 0) {
      dispatch(updateDraft({ boardingStop: stops[0].stop_id || stops[0].id }));
    }
    if (!draft.destinationStop && stops.length > 1) {
      dispatch(updateDraft({ destinationStop: stops[stops.length - 1].stop_id || stops[stops.length - 1].id }));
    }
  }, [dispatch, stops]);

  if (!route || stops.length === 0) {
    return (
      <Screen showBack backTitle="Dashboard">
        <EmptyState
          title="Route not loaded"
          subtitle="Please complete Route Initialization from the command center first."
        />
      </Screen>
    );
  }

  // Derive boarding stop index to offer smart previous, current, and next stop chips
  const currentStopIndex = Math.max(
    0,
    stops.findIndex(
      (s) => (s.stop_id || s.id) === draft.boardingStop || s.name === draft.boardingStop
    )
  );

  const prevStop = currentStopIndex > 0 ? stops[currentStopIndex - 1] : null;
  const currentStop = stops[currentStopIndex] || stops[0];
  const nextStop = currentStopIndex < stops.length - 1 ? stops[currentStopIndex + 1] : null;

  const fare = calculateFare(
    route,
    draft.boardingStop,
    draft.destinationStop,
    draft.passengerCounts
  );
  const total = totalPassengers(draft.passengerCounts);
  const canPrint = draft.paymentMode === "cash" || paymentStatus === "success";
  const paymentAmount = fare.finalAmount;

  const startOnlinePayment = async () => {
    try {
      await dispatch(verifyOnlinePayment(paymentAmount)).unwrap();
    } catch {
      // reducer stores failed status
    }
  };

  const printTicket = async () => {
    if (total === 0) {
      Alert.alert("Select Passengers", "Please select at least 1 passenger.");
      return;
    }
    if (!draft.boardingStop || !draft.destinationStop) {
      Alert.alert("Missing Stops", "Please select boarding and destination stops.");
      return;
    }

    setIsIssuing(true);
    try {
      const payload = {
        shift_id: profile?.shiftId || profile?.shift || "shift-001",
        source_stop_id: draft.boardingStop,
        dest_stop_id: draft.destinationStop,
        passenger_count: total,
        total_fare: fare.finalAmount,
        payment_method: draft.paymentMode,
        timestamp: new Date().toISOString(),
      };

      let ticketId = `TKT-${Date.now().toString().slice(-6)}`;
      let isOfflineSaved = false;
      try {
        const response = await issueTicket(payload);
        if (response?.ticket_id) {
          ticketId = response.ticket_id;
        }
      } catch (apiErr) {
        // Save to offline batch queue for auto-sync when network returns
        isOfflineSaved = true;
        await storage.enqueueOfflineTicket({
          ticket_id: ticketId,
          source_stop_id: payload.source_stop_id,
          dest_stop_id: payload.dest_stop_id,
          passenger_count: payload.passenger_count,
          total_fare: payload.total_fare,
          payment_method: payload.payment_method,
          timestamp: payload.timestamp,
        });
      }

      await dispatch(submitBooking({ ticket_id: ticketId })).unwrap();
      
      const boardingStopObj = stops.find((s) => (s.stop_id || s.id) === draft.boardingStop);
      const destStopObj = stops.find((s) => (s.stop_id || s.id) === draft.destinationStop);

      setPrintedTicketSlip({
        ticket_id: ticketId,
        source_stop: boardingStopObj?.name || draft.boardingStop,
        dest_stop: destStopObj?.name || draft.destinationStop,
        passenger_count: total,
        passengerCounts: draft.passengerCounts,
        total_fare: fare.finalAmount,
        payment_method: draft.paymentMode,
        timestamp: payload.timestamp,
        busNumber: profile?.busNumber || "MH-30-AB-1234",
        shift_id: profile?.shiftId || "shift-001",
        conductorName: profile?.conductorName || "Active Conductor",
        conductorId: profile?.conductorId || "cond-1001",
        routeName: route?.route_name || "MSRTC State Highway Route",
      });
    } catch (error) {
      Alert.alert(
        "Booking failed",
        error instanceof Error ? error.message : "Unknown booking error"
      );
    } finally {
      setIsIssuing(false);
    }
  };

  const handleUpdateCount = (key, delta) => {
    const current = draft.passengerCounts?.[key] || 0;
    const nextVal = Math.max(0, current + delta);
    dispatch(updatePassengerCounts({ [key]: nextVal }));
  };

  return (
    <Screen showBack backTitle="Dashboard">
      {/* Screen Title */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Ticket Booking</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            One-handed rapid fare issuance with auto-concession rules
          </Text>
        </View>
        <StatusBadge
          label={draft.paymentMode.toUpperCase()}
          tone={draft.paymentMode === "cash" ? "info" : "success"}
        />
      </View>

      {/* Origin Stop Section with Smart Chips */}
      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Boarding From</Text>
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          Quick-select from recent stops or tap the dropdown below:
        </Text>

        {/* Quick Chips Row */}
        <View style={styles.chipRow}>
          {prevStop && (
            <Pressable
              onPress={() =>
                dispatch(updateDraft({ boardingStop: prevStop.stop_id || prevStop.id }))
              }
              style={[
                styles.quickChip,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                draft.boardingStop === (prevStop.stop_id || prevStop.id) &&
                  styles.quickChipActive,
              ]}
            >
              <Text style={styles.quickChipIcon}>⏪</Text>
              <Text
                style={[
                  styles.quickChipText,
                  { color: theme.text },
                  draft.boardingStop === (prevStop.stop_id || prevStop.id) &&
                    styles.quickChipTextActive,
                ]}
                numberOfLines={1}
              >
                {prevStop.name} (Prev)
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() =>
              dispatch(updateDraft({ boardingStop: currentStop.stop_id || currentStop.id }))
            }
            style={[
              styles.quickChip,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              draft.boardingStop === (currentStop.stop_id || currentStop.id) &&
                styles.quickChipActive,
            ]}
          >
            <Text style={styles.quickChipIcon}>📍</Text>
            <Text
              style={[
                styles.quickChipText,
                { color: theme.text },
                draft.boardingStop === (currentStop.stop_id || currentStop.id) &&
                  styles.quickChipTextActive,
              ]}
              numberOfLines={1}
            >
              {currentStop.name} (GPS)
            </Text>
          </Pressable>

          {nextStop && (
            <Pressable
              onPress={() =>
                dispatch(updateDraft({ boardingStop: nextStop.stop_id || nextStop.id }))
              }
              style={[
                styles.quickChip,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                draft.boardingStop === (nextStop.stop_id || nextStop.id) &&
                  styles.quickChipActive,
              ]}
            >
              <Text style={styles.quickChipIcon}>⏩</Text>
              <Text
                style={[
                  styles.quickChipText,
                  { color: theme.text },
                  draft.boardingStop === (nextStop.stop_id || nextStop.id) &&
                    styles.quickChipTextActive,
                ]}
                numberOfLines={1}
              >
                {nextStop.name} (Next)
              </Text>
            </Pressable>
          )}
        </View>

        {/* Full Dropdown for Boarding */}
        <View style={[styles.selectBox, { backgroundColor: isDark ? "#1e293b" : "#f8fafc", borderColor: theme.border, borderWidth: 1 }]}>
          <Picker
            selectedValue={draft.boardingStop}
            onValueChange={(value) => dispatch(updateDraft({ boardingStop: value }))}
            style={[
              styles.picker,
              {
                color: isDark ? "#f8fafc" : "#0f172a",
                backgroundColor: isDark ? "#1e293b" : "#f8fafc",
              },
            ]}
            dropdownIconColor={isDark ? "#f8fafc" : "#0f172a"}
          >
            {stops.map((stop, idx) => (
              <Picker.Item
                key={stop.id || stop.stop_id || idx}
                label={`Stop #${idx + 1}: ${stop.name}`}
                value={stop.stop_id || stop.id}
                style={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Destination Stop Section */}
      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Destination To</Text>
        <View style={[styles.selectBox, { backgroundColor: isDark ? "#1e293b" : "#f8fafc", borderColor: theme.border, borderWidth: 1 }]}>
          <Picker
            selectedValue={draft.destinationStop}
            onValueChange={(value) => dispatch(updateDraft({ destinationStop: value }))}
            style={[
              styles.picker,
              {
                color: isDark ? "#f8fafc" : "#0f172a",
                backgroundColor: isDark ? "#1e293b" : "#f8fafc",
              },
            ]}
            dropdownIconColor={isDark ? "#f8fafc" : "#0f172a"}
          >
            <Picker.Item
              label="Select destination stop..."
              value=""
              style={{
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                color: isDark ? "#94a3b8" : "#64748b",
              }}
            />
            {stops.map((stop, idx) => (
              <Picker.Item
                key={stop.id || stop.stop_id || idx}
                label={`Stop #${idx + 1}: ${stop.name}`}
                value={stop.stop_id || stop.id}
                style={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Passenger Count Section with Thumb-Friendly Steppers */}
      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.passengerHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Passenger Counts</Text>
          <Text
            style={[
              styles.totalBadge,
              {
                backgroundColor: isDark ? "#183255" : colors.light.primarySoft,
                color: theme.primary,
              },
            ]}
          >
            Total: {total} Passenger{total !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Adult Male (General) */}
        <View style={[styles.stepperItem, { borderBottomColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepperTitle, { color: theme.text }]}>Adult Male</Text>
            <Text style={[styles.stepperSubtitle, { color: theme.textMuted }]}>Full Standard Fare</Text>
          </View>
          <View style={[styles.stepperActions, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Pressable
              onPress={() => handleUpdateCount("adultMale", -1)}
              style={styles.stepperBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="minus" size={20} color={theme.text} />
            </Pressable>
            <View
              style={[
                styles.stepperValBox,
                {
                  backgroundColor: isDark ? "#07111f" : "#ffffff",
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.stepperVal, { color: theme.text }]}>
                {draft.passengerCounts.adultMale}
              </Text>
            </View>
            <Pressable
              onPress={() => handleUpdateCount("adultMale", 1)}
              style={styles.stepperBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {/* Female (Mahila Sanman Yojana - 50% Concession) */}
        {activeYojnas.mahilaSanman && (
          <View style={[styles.stepperItem, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.stepperTitle, { color: theme.text }]}>Women</Text>
                <View style={styles.schemeTag}>
                  <Text style={styles.schemeTagText}>50% Off</Text>
                </View>
              </View>
              <Text style={[styles.stepperSubtitle, { color: theme.textMuted }]}>Mahila Sanman Yojana</Text>
            </View>
            <View style={[styles.stepperActions, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Pressable
                onPress={() => handleUpdateCount("women", -1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="minus" size={20} color={theme.text} />
              </Pressable>
              <View
                style={[
                  styles.stepperValBox,
                  {
                    backgroundColor: isDark ? "#07111f" : "#ffffff",
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.stepperVal, { color: theme.text }]}>
                  {draft.passengerCounts.women}
                </Text>
              </View>
              <Pressable
                onPress={() => handleUpdateCount("women", 1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="plus" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Senior Citizens (Concession) */}
        {activeYojnas.seniorCitizen && (
          <View style={[styles.stepperItem, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.stepperTitle, { color: theme.text }]}>Senior Citizens</Text>
                <View style={[styles.schemeTag, { backgroundColor: "#e0f2fe" }]}>
                  <Text style={[styles.schemeTagText, { color: "#0369a1" }]}>75+ Free</Text>
                </View>
              </View>
              <Text style={[styles.stepperSubtitle, { color: theme.textMuted }]}>Amrit Varishtha Concession</Text>
            </View>
            <View style={[styles.stepperActions, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Pressable
                onPress={() => handleUpdateCount("seniors", -1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="minus" size={20} color={theme.text} />
              </Pressable>
              <View
                style={[
                  styles.stepperValBox,
                  {
                    backgroundColor: isDark ? "#07111f" : "#ffffff",
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.stepperVal, { color: theme.text }]}>
                  {draft.passengerCounts.seniors}
                </Text>
              </View>
              <Pressable
                onPress={() => handleUpdateCount("seniors", 1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="plus" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Children (Half Ticket) */}
        {activeYojnas.childConcession && (
          <View style={[styles.stepperItem, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.stepperTitle, { color: theme.text }]}>Children (5-12)</Text>
                <View style={[styles.schemeTag, { backgroundColor: "#fef3c7" }]}>
                  <Text style={[styles.schemeTagText, { color: "#b45309" }]}>Half Fare</Text>
                </View>
              </View>
              <Text style={[styles.stepperSubtitle, { color: theme.textMuted }]}>Standard Child Ticket</Text>
            </View>
            <View style={[styles.stepperActions, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Pressable
                onPress={() => handleUpdateCount("children", -1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="minus" size={20} color={theme.text} />
              </Pressable>
              <View
                style={[
                  styles.stepperValBox,
                  {
                    backgroundColor: isDark ? "#07111f" : "#ffffff",
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.stepperVal, { color: theme.text }]}>
                  {draft.passengerCounts.children}
                </Text>
              </View>
              <Pressable
                onPress={() => handleUpdateCount("children", 1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="plus" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Payment Mode Selection */}
      <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Payment Mode</Text>
        <View style={styles.paymentRow}>
          <Pressable
            onPress={() => dispatch(setPaymentMode("cash"))}
            style={[
              styles.payModeBtn,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              draft.paymentMode === "cash" && styles.payModeBtnActive,
            ]}
          >
            <MaterialCommunityIcons
              name="cash"
              size={24}
              color={draft.paymentMode === "cash" ? "#fff" : theme.text}
            />
            <Text
              style={[
                styles.payModeText,
                { color: theme.text },
                draft.paymentMode === "cash" && styles.payModeTextActive,
              ]}
            >
              Cash (Print)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => dispatch(setPaymentMode("online"))}
            style={[
              styles.payModeBtn,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              draft.paymentMode === "online" && styles.payModeBtnActive,
            ]}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={22}
              color={draft.paymentMode === "online" ? "#fff" : theme.text}
            />
            <Text
              style={[
                styles.payModeText,
                { color: theme.text },
                draft.paymentMode === "online" && styles.payModeTextActive,
              ]}
            >
              UPI / QR
            </Text>
          </Pressable>
        </View>

        {draft.paymentMode === "online" && (
          <View style={[styles.onlinePayBox, { backgroundColor: scheme === "dark" ? "#10233b" : "#eef4ff" }]}>
            <Text style={[styles.onlinePayTitle, { color: theme.text }]}>UPI Payment Verification</Text>
            <Text style={[styles.onlinePayAmount, { color: theme.primary }]}>{currency(paymentAmount)}</Text>
            <PrimaryButton
              title={paymentStatus === "success" ? "✓ Payment Confirmed" : "Verify UPI Received"}
              tone={paymentStatus === "success" ? "success" : "primary"}
              onPress={startOnlinePayment}
              loading={paymentStatus === "pending"}
            />
          </View>
        )}
      </View>

      {/* Fare Breakdown Card (High-Contrast Digital Console) */}
      <View style={styles.fareSummaryCard}>
        <View style={styles.fareSummaryRow}>
          <Text style={styles.fareSummaryLabel}>Journey:</Text>
          <Text style={styles.fareSummaryVal}>{fare.stopLabel || "Select Stops"}</Text>
        </View>
        <View style={styles.fareSummaryRow}>
          <Text style={styles.fareSummaryLabel}>Base Rate / Passenger:</Text>
          <Text style={styles.fareSummaryVal}>{currency(fare.baseFare)}</Text>
        </View>
        {fare.discount > 0 && (
          <View style={styles.fareSummaryRow}>
            <Text style={[styles.fareSummaryLabel, { color: "#4ade80" }]}>
              Yojana Concessions:
            </Text>
            <Text style={[styles.fareSummaryVal, { color: "#4ade80" }]}>
              -{currency(fare.discount)}
            </Text>
          </View>
        )}
        <View style={[styles.fareSummaryRow, styles.finalFareRow]}>
          <Text style={styles.finalFareLabel}>Total Fare to Collect:</Text>
          <Text style={styles.finalFareAmount}>{currency(fare.finalAmount)}</Text>
        </View>
      </View>

      {/* Issue Action Buttons */}
      <View style={styles.actionRow}>
        <View style={{ flex: 2 }}>
          <PrimaryButton
            title={isIssuing ? "Printing..." : `Print Ticket • ${currency(fare.finalAmount)}`}
            onPress={printTicket}
            loading={isIssuing}
            disabled={!canPrint || total === 0}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            title="Reset"
            tone="secondary"
            onPress={() => dispatch(clearBookingStops())}
          />
        </View>
      </View>

      {/* Printed Ticket Thermal Slip Modal (Item 4) */}
      <PrintedTicketModal
        visible={Boolean(printedTicketSlip)}
        ticket={printedTicketSlip}
        isReprint={false}
        onClose={() => setPrintedTicketSlip(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  panel: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.light.text,
  },
  helperText: {
    fontSize: 12,
    color: colors.light.textMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: "wrap",
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  quickChipActive: {
    backgroundColor: colors.light.primarySoft,
    borderColor: colors.light.primary,
  },
  quickChipIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.light.text,
  },
  quickChipTextActive: {
    color: colors.light.primary,
  },
  selectBox: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  passengerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  totalBadge: {
    backgroundColor: colors.light.primarySoft,
    color: colors.light.primary,
    fontWeight: "800",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  stepperItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.light.text,
  },
  stepperSubtitle: {
    fontSize: 12,
    color: colors.light.textMuted,
    marginTop: 2,
  },
  schemeTag: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  schemeTagText: {
    color: "#15803d",
    fontSize: 10,
    fontWeight: "800",
  },
  stepperActions: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  stepperBtn: {
    width: 40,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValBox: {
    minWidth: 44,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  stepperVal: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  paymentRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  payModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  payModeBtnActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  payModeText: {
    fontWeight: "800",
    fontSize: 14,
    color: colors.light.text,
  },
  payModeTextActive: {
    color: "#fff",
  },
  onlinePayBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.light.surfaceAlt,
    alignItems: "center",
  },
  onlinePayTitle: {
    fontSize: 13,
    color: colors.light.textMuted,
    fontWeight: "600",
  },
  onlinePayAmount: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.light.text,
    marginVertical: spacing.sm,
  },
  fareSummaryCard: {
    backgroundColor: "#0b1f33",
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  fareSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fareSummaryLabel: {
    color: "#93a6bd",
    fontSize: 13,
  },
  fareSummaryVal: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  finalFareRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#20334d",
    alignItems: "center",
  },
  finalFareLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  finalFareAmount: {
    color: "#4ade80",
    fontSize: 24,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
});
