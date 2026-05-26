// File: src/screens/EmergencyAlertScreen.js
// Purpose: Submits urgent alerts with bus and GPS context.
// Imports: alert slice, conductor profile, route GPS, and form helpers.
// Behavior: Submit either posts the alert or shows why the report failed.
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { submitEmergency } from "../store/slices/alertSlice";

export const EmergencyAlertScreen = () => {
  const dispatch = useAppDispatch();
  const bus = useAppSelector((state) => state.conductor.profile);
  const gps = useAppSelector((state) => state.route.currentGps);
  const submitting = useAppSelector((state) => state.alerts.submitting);
  const [alertType, setAlertType] = useState("Accident");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!bus) {
      return;
    }
    try {
      await dispatch(
        submitEmergency({
          alertType,
          message,
          busId: bus.busId,
          gpsLocation: gps,
        }),
      ).unwrap();
      Alert.alert(
        "Alert sent",
        "Emergency support has been notified with GPS data.",
      );
      setMessage("");
    } catch (error) {
      Alert.alert(
        "Submission failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  if (!bus) {
    return (
      <Screen>
        <EmptyState
          title="Bus profile unavailable"
          subtitle="Emergency reporting needs conductor and bus data to be ready."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Emergency Alert</Text>
          <Text style={styles.subtitle}>
            Submit accident, breakdown, blockage or custom support requests in
            real time.
          </Text>
        </View>
        <StatusBadge label="REAL-TIME" tone="danger" />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Alert Type</Text>
        <View style={styles.selectBox}>
          <Picker
            selectedValue={alertType}
            onValueChange={(value) => setAlertType(String(value))}
          >
            {[
              "Accident",
              "Breakdown",
              "Road Blockage",
              "Emergency Support",
              "Custom",
            ].map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>
        <Text style={styles.label}>Message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Describe the emergency or request"
          placeholderTextColor={colors.light.textMuted}
          multiline
          style={styles.input}
        />

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={20}
            color={colors.light.primary}
          />
          <Text style={styles.infoText}>
            Bus {bus.busId} • GPS {gps.latitude.toFixed(4)},{" "}
            {gps.longitude.toFixed(4)}
          </Text>
        </View>

        <PrimaryButton
          title="Send Emergency Alert"
          onPress={submit}
          loading={submitting}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  title: { color: colors.light.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.light.textMuted, marginTop: 6, maxWidth: 700 },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  label: {
    color: colors.light.text,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: spacing.md,
  },
  selectBox: {
    backgroundColor: colors.light.surfaceAlt,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    padding: spacing.md,
    textAlignVertical: "top",
    color: colors.light.text,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef4ff",
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.lg,
  },
  infoText: { marginLeft: 8, color: colors.light.text, fontWeight: "700" },
});
