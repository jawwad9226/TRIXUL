// File: src/components/TicketTile.js
// Purpose: Formats one saved ticket into a readable history card.
// Imports: theme constants and time/currency format helpers.
// Behavior: The tile stays read-only and reflects stored ticket data.
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../constants/theme";
import { currency, timeLabel } from "../utils/format";

export const TicketTile = ({ ticket }) => (
  <View style={styles.card}>
    <Text style={styles.id}>{ticket.ticketId}</Text>
    <Text style={styles.route}>
      {ticket.boardingStop} → {ticket.destinationStop}
    </Text>
    <Text style={styles.meta}>
      Fare {currency(ticket.fare)} | {ticket.paymentMode.toUpperCase()}
    </Text>
    <Text style={styles.time}>{timeLabel(ticket.timestamp)}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.md,
  },
  id: { color: colors.light.primary, fontWeight: "800" },
  route: { color: colors.light.text, fontWeight: "700", marginTop: 6 },
  meta: { color: colors.light.textMuted, marginTop: 6 },
  time: { color: colors.light.textMuted, marginTop: 4, fontSize: 12 },
});
