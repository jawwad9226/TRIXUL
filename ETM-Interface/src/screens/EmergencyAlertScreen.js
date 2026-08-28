import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";

import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { submitEmergencyLocally } from "../store/slices/alertSlice";

export const EmergencyAlertScreen = () => {
  const dispatch = useAppDispatch();
  const conductorProfile = useAppSelector((state) => state.conductor.profile);
  const submitting = useAppSelector((state) => state.alerts.submitting);
  const [alertType, setAlertType] = useState("Accident");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const submit = async () => {
    if (!conductorProfile) {
      Alert.alert("Not initialized", "Please complete the initialization flow first.");
      return;
    }

    setIsSending(true);
    try {
      // Attempt to get live GPS for context — gracefully handle denial
      let gpsLocation = { latitude: null, longitude: null };
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === "granted") {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
          gpsLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      } catch (gpsError) {
        // GPS not available — still send the alert without coordinates
      }

      const alertRecord = {
        id: `ALERT-${Date.now()}`,
        alertType,
        message,
        busId: conductorProfile.busId ?? "unknown",
        conductorId: conductorProfile.conductorId,
        gpsLocation,
        timestamp: new Date().toISOString(),
      };

      // Store locally and dispatch to Redux state
      // TODO: POST to backend emergency endpoint when available
      dispatch(submitEmergencyLocally(alertRecord));

      Alert.alert(
        "Alert recorded",
        "Emergency has been logged locally. Connect to backend for live dispatch."
      );
      setMessage("");
    } catch (error) {
      Alert.alert(
        "Submission failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!conductorProfile) {
    return (
      <Screen>
        <EmptyState
          title="Not initialized"
          subtitle="Run the Initializer to set up your conductor profile before reporting emergencies."
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
            Conductor: {conductorProfile.conductorName ?? "—"}
            {conductorProfile.busId ? ` • Bus ${conductorProfile.busId}` : ""}
          </Text>
        </View>

        <PrimaryButton
          title={isSending ? "Sending..." : "Send Emergency Alert"}
          onPress={submit}
          loading={isSending}
          disabled={isSending || !message.trim()}
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
