// File: src/screens/TicketHistoryScreen.js
// Purpose: Reads locally saved tickets for review and audit.
// Imports: storage plus shared empty-state and ticket UI components.
// Behavior: The screen only reflects stored history and does not modify it.
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";

import { EmptyState } from "../components/EmptyState";
import { Screen } from "../components/Screen";
import { colors, spacing } from "../constants/theme";
import { storage } from "../services/storage";
import { TicketTile } from "../components/TicketTile";

export const TicketHistoryScreen = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    storage
      .loadTicketHistory([])
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Ticket History</Text>
      <Text style={styles.subtitle}>
        Locally cached printable tickets for audit and conductor review.
      </Text>
      {history.length ? (
        <FlatList
          data={history}
          keyExtractor={(item) => item.ticketId}
          style={styles.list}
          renderItem={({ item }) => <TicketTile ticket={item} />}
        />
      ) : (
        <EmptyState
          title="No saved tickets yet"
          subtitle="Completed bookings will appear here after printing or payment verification."
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
});
