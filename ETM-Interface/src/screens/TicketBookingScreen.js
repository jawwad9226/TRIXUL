import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { storage } from "../services/storage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  hydrateHistory,
  setPaymentMode,
  submitBooking,
  updateDraft,
  updatePassengerCounts,
  verifyOnlinePayment,
} from "../store/slices/ticketSlice";
import { calculateFare, totalPassengers } from "../utils/fare";
import { currency, timeLabel } from "../utils/format";

export const TicketBookingScreen = () => {
  const dispatch = useAppDispatch();
  const route = useAppSelector((state) => state.route.route);
  const stops = route?.stops ?? [];
  const draft = useAppSelector((state) => state.ticket.draft);
  const paymentStatus = useAppSelector((state) => state.ticket.paymentStatus);
  const bookingStatus = useAppSelector((state) => state.ticket.bookingStatus);
  const currentTicket = useAppSelector((state) => state.ticket.currentTicket);
  const bookingError = useAppSelector((state) => state.ticket.bookingError);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    storage
      .loadTicketHistory([])
      .then((history) => dispatch(hydrateHistory(history)))
      .catch(() => null);
  }, [dispatch]);

  if (!route) {
    return (
      <Screen>
        <EmptyState
          title="Route not available"
          subtitle="Wait for the route to finish loading before booking tickets."
        />
      </Screen>
    );
  }

  const fare = calculateFare(
    route,
    draft.boardingStop,
    draft.destinationStop,
    draft.passengerCounts,
  );
  const total = totalPassengers(draft.passengerCounts);
  const canPrint = draft.paymentMode === "cash" || paymentStatus === "success";

  const paymentAmount = fare.finalAmount;

  const startOnlinePayment = async () => {
    setShowQr(true);
    try {
      await dispatch(verifyOnlinePayment(paymentAmount)).unwrap();
    } catch {
      // reducer stores the failed status
    }
  };

  const printTicket = async () => {
    try {
      await dispatch(submitBooking()).unwrap();
      Alert.alert(
        "Ticket saved",
        "Digital ticket has been generated and stored locally.",
      );
    } catch (error) {
      Alert.alert(
        "Booking failed",
        error instanceof Error ? error.message : "Unknown booking error",
      );
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ticket Booking</Text>
          <Text style={styles.subtitle}>
            Group booking, category discounts, payment verification, and local
            ticket storage.
          </Text>
        </View>
        <StatusBadge
          label={draft.paymentMode.toUpperCase()}
          tone={
            draft.paymentMode === "cash"
              ? "info"
              : paymentStatus === "success"
                ? "success"
                : paymentStatus === "failed"
                  ? "danger"
                  : "warning"
          }
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.lg }}
      >
        {stops.map((stop) => (
          <View key={stop.id} style={styles.stopChip}>
            <Text style={styles.stopText}>{stop.name}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Passenger Route</Text>
        <View style={styles.grid2}>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Boarding Stop</Text>
            <View style={styles.selectBox}>
              <Picker
                selectedValue={draft.boardingStop}
                onValueChange={(value) =>
                  dispatch(updateDraft({ boardingStop: value }))
                }
              >
                <Picker.Item label="Select boarding stop" value="" />
                {stops.map((stop) => (
                  <Picker.Item
                    key={stop.id}
                    label={stop.name}
                    value={stop.name}
                  />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Destination Stop</Text>
            <View style={styles.selectBox}>
              <Picker
                selectedValue={draft.destinationStop}
                onValueChange={(value) =>
                  dispatch(updateDraft({ destinationStop: value }))
                }
              >
                <Picker.Item label="Select destination stop" value="" />
                {stops.map((stop) => (
                  <Picker.Item
                    key={stop.id}
                    label={stop.name}
                    value={stop.name}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Passenger Counts</Text>
        <View style={styles.grid2}>
          <Field
            label="Women"
            value={String(draft.passengerCounts.women)}
            onChangeText={(value) =>
              dispatch(updatePassengerCounts({ women: Number(value || 0) }))
            }
            keyboardType="number-pad"
          />
          <Field
            label="Senior Citizens (75+)"
            value={String(draft.passengerCounts.seniors)}
            onChangeText={(value) =>
              dispatch(updatePassengerCounts({ seniors: Number(value || 0) }))
            }
            keyboardType="number-pad"
          />
          <Field
            label="Children"
            value={String(draft.passengerCounts.children)}
            onChangeText={(value) =>
              dispatch(updatePassengerCounts({ children: Number(value || 0) }))
            }
            keyboardType="number-pad"
          />
          <Field
            label="Adult Male"
            value={String(draft.passengerCounts.adultMale)}
            onChangeText={(value) =>
              dispatch(updatePassengerCounts({ adultMale: Number(value || 0) }))
            }
            keyboardType="number-pad"
          />
        </View>
        <Text style={styles.totalText}>Total passengers: {total}</Text>

        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.paymentRow}>
          <PrimaryButton
            title="Cash"
            tone={draft.paymentMode === "cash" ? "primary" : "secondary"}
            onPress={() => dispatch(setPaymentMode("cash"))}
          />
          <PrimaryButton
            title="UPI / Online"
            tone={draft.paymentMode === "online" ? "primary" : "secondary"}
            onPress={() => dispatch(setPaymentMode("online"))}
          />
        </View>

        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>Fare Breakdown</Text>
          <Text style={styles.fareLine}>
            Stop pair: {fare.stopLabel ?? "Select two stops"}
          </Text>
          <Text style={styles.fareLine}>
            Base fare: {currency(fare.baseFare)}
          </Text>
          <Text style={styles.fareLine}>
            Passenger count: {fare.passengerCount}
          </Text>
          <Text style={styles.fareLine}>
            Adjustment: -{currency(fare.discount)}
          </Text>
          <Text style={styles.finalFare}>
            Final amount: {currency(fare.finalAmount)}
          </Text>
        </View>

        {draft.paymentMode === "online" ? (
          <View style={styles.qrCard}>
            <Text style={styles.sectionTitle}>Online Payment</Text>
            <Text style={styles.qrAmount}>{currency(paymentAmount)}</Text>
            <View style={styles.qrWrap}>
              <View style={styles.qrPlaceholder}>
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={54}
                  color={colors.light.primary}
                />
                <Text style={styles.qrPlaceholderText}>Mock UPI code</Text>
              </View>
            </View>
            <Text style={styles.paymentMeta}>
              Status: {paymentStatus.toUpperCase()}
            </Text>
            <View style={styles.paymentRow}>
              <PrimaryButton
                title="Verify Payment"
                onPress={startOnlinePayment}
                loading={paymentStatus === "pending"}
              />
              <PrimaryButton
                title="Retry"
                tone="secondary"
                onPress={startOnlinePayment}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.paymentRow}>
          <PrimaryButton
            title={canPrint ? "Print Ticket" : "Await Payment"}
            onPress={printTicket}
            loading={bookingStatus === "pending"}
            disabled={!canPrint}
          />
          <PrimaryButton
            title="Clear Stops"
            tone="secondary"
            onPress={() =>
              dispatch(updateDraft({ boardingStop: "", destinationStop: "" }))
            }
          />
        </View>

        {bookingError ? <Text style={styles.error}>{bookingError}</Text> : null}
        {currentTicket ? (
          <Text style={styles.success}>
            Ticket {currentTicket.ticketId} generated at{" "}
            {timeLabel(currentTicket.timestamp)}
          </Text>
        ) : null}
      </View>

      <Modal visible={showQr} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons
              name="cellphone-wireless"
              size={42}
              color={colors.light.primary}
            />
            <Text style={styles.modalTitle}>Payment Gateway</Text>
            <Text style={styles.modalText}>
              Waiting for UPI confirmation from the mock payment service.
            </Text>
            <PrimaryButton title="Close" onPress={() => setShowQr(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { color: colors.light.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.light.textMuted, marginTop: 6, maxWidth: 700 },
  stopChip: {
    backgroundColor: colors.light.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.xl,
    marginRight: spacing.sm,
  },
  stopText: { color: colors.light.text, fontWeight: "700" },
  panel: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  sectionTitle: {
    color: colors.light.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  grid2: { gap: spacing.md },
  fieldWrap: { marginBottom: spacing.md },
  label: { color: colors.light.text, marginBottom: 8, fontWeight: "700" },
  selectBox: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.light.surfaceAlt,
  },
  totalText: {
    color: colors.light.text,
    fontWeight: "800",
    marginBottom: spacing.lg,
  },
  paymentRow: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  fareCard: {
    backgroundColor: "#eef4ff",
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  fareTitle: {
    qrWrap: { marginTop: spacing.md, alignItems: "center" },
    qrPlaceholder: {
      width: 180,
      height: 180,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.light.primary,
      backgroundColor: "#ffffff",
      alignItems: "center",
      justifyContent: "center",
    },
    qrPlaceholderText: {
      marginTop: 8,
      fontWeight: "700",
      color: colors.light.textMuted,
    },
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  fareLine: { color: colors.light.textMuted, marginTop: 4 },
  finalFare: {
    color: colors.light.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  qrCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.light.surfaceAlt,
    alignItems: "center",
  },
  qrWrap: {
    padding: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  qrAmount: {
    color: colors.light.primary,
    fontSize: 26,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  paymentMeta: { color: colors.light.textMuted, marginTop: spacing.sm },
  error: {
    color: colors.light.danger,
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  success: {
    color: colors.light.success,
    marginTop: spacing.sm,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000080",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  modalTitle: {
    color: colors.light.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  modalText: {
    color: colors.light.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
