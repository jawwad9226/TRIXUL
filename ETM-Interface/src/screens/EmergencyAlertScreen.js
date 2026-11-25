<<<<<<< HEAD
// File: src/screens/EmergencyAlertScreen.js
// Purpose: Submits urgent alerts with bus and GPS context.
// Imports: alert slice, conductor profile, route GPS, and form helpers.
// Behavior: Submit either posts the alert or shows why the report failed.
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
=======
import React, { useState, useRef } from "react";
import { Alert, StyleSheet, Text, TextInput, View, Animated, PanResponder } from "react-native";
>>>>>>> origin/main
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
<<<<<<< HEAD
import { submitEmergency } from "../store/slices/alertSlice";
=======
import { submitEmergencyLocally } from "../store/slices/alertSlice";
import { reportIncident } from "../services/api";

function SlideToSOS({ onConfirm, disabled }) {
  const pan = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(300);
  const thumbWidth = 56;
  const maxDrag = Math.max(0, trackWidth - thumbWidth);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_, gestureState) => {
        if (disabled) return;
        const newX = Math.max(0, Math.min(gestureState.dx, maxDrag));
        pan.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled) return;
        if (gestureState.dx >= maxDrag * 0.8) {
          Animated.timing(pan, {
            toValue: maxDrag,
            duration: 120,
            useNativeDriver: false,
          }).start(() => {
            onConfirm();
            setTimeout(() => {
              Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
            }, 1000);
          });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  return (
    <View
      style={styles.slideTrack}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Text style={styles.slideTrackText}>Slide to Dispatch SOS ➔</Text>
      <Animated.View
        style={[
          styles.slideThumb,
          { transform: [{ translateX: pan }] },
          disabled && { opacity: 0.5 },
        ]}
        {...panResponder.panHandlers}
      >
        <MaterialCommunityIcons name="alert-octagon" size={28} color="#fff" />
      </Animated.View>
    </View>
  );
}

>>>>>>> origin/main

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
<<<<<<< HEAD
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
        "Alert recorded",
        "Emergency has been logged locally. Connect to backend for live dispatch.",
      );
=======
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

      // Map alertType to backend severity ('SOS', 'WARNING', 'INFO')
      let severity = "WARNING";
      if (alertType === "Accident" || alertType === "Emergency Support") {
        severity = "SOS";
      } else if (alertType === "Breakdown" || alertType === "Road Blockage") {
        severity = "WARNING";
      }

      // Try broadcasting to backend Admin Command Center
      try {
        await reportIncident({
          shift_id: conductorProfile.shiftId,
          severity,
          message: `[${alertType}] ${message}`,
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
        });
        Alert.alert(
          "🚨 Emergency Broadcasted",
          "Alert dispatched live to Admin Command Center & Depot."
        );
      } catch (backendError) {
        // Fallback for dead zones
        Alert.alert(
          "Alert Recorded Locally",
          "Backend unreachable or offline. Emergency saved to device and will sync on reconnection."
        );
      }

      // Store in local Redux state
      dispatch(submitEmergencyLocally(alertRecord));
>>>>>>> origin/main
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
    <Screen showBack backTitle="Dashboard">
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

<<<<<<< HEAD
        <PrimaryButton
          title="Send Emergency Alert"
          onPress={submit}
          loading={submitting}
        />
=======
        {/* Stage 1 & 2: Slide to SOS for Accidents / Critical Emergencies to prevent bumpy road triggers */}
        {alertType === "Accident" || alertType === "Emergency Support" ? (
          <View style={{ marginTop: spacing.sm }}>
            <SlideToSOS onConfirm={submit} disabled={isSending || !message.trim()} />
            <Text style={styles.sliderHelperText}>
              Rugged Anti-Bumping Protection: Drag thumb completely to right to broadcast emergency.
            </Text>
          </View>
        ) : (
          <PrimaryButton
            title={isSending ? "Sending Alert..." : "Broadcast Incident Alert"}
            onPress={submit}
            loading={isSending}
            disabled={isSending || !message.trim()}
          />
        )}
>>>>>>> origin/main
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
  slideTrack: {
    height: 60,
    backgroundColor: "#7f1d1d",
    borderRadius: 30,
    justifyContent: "center",
    padding: 4,
    borderWidth: 2,
    borderColor: "#dc2626",
    overflow: "hidden",
    position: "relative",
  },
  slideTrackText: {
    color: "#fecaca",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  slideThumb: {
    position: "absolute",
    left: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderHelperText: {
    color: colors.light.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
});
