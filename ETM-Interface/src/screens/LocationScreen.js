<<<<<<< HEAD
// File: src/screens/LocationScreen.js
// Purpose: Captures GPS and pushes live bus location updates to the backend.
// Imports: location API, route state, and bus telemetry actions.
// Behavior: The screen keeps the store and backend in sync with each report.
=======
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";

<<<<<<< HEAD
import { ProgressBar } from "../components/ProgressBar";
import { Screen } from "../components/Screen";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { submitBusLocation } from "../store/slices/busSlice";
import { setGps } from "../store/slices/routeSlice";

export const LocationScreen = () => {
  const dispatch = useAppDispatch();
  const route = useAppSelector((state) => state.route.route);
  const conductor = useAppSelector((state) => state.conductor.profile);
  const locationLabel = useAppSelector((state) => state.bus.locationLabel);
  const progress = useAppSelector((state) => state.bus.locationProgress);
  const speed = useAppSelector((state) => state.bus.locationSpeed);
  const syncStatus = useAppSelector((state) => state.bus.locationSyncStatus);
  const locationTimestamp = useAppSelector(
    (state) => state.bus.locationTimestamp,
  );
  const [permissionMessage, setPermissionMessage] = useState(null);
=======
import { Screen } from "../components/Screen";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setBusStatus, setBusLoading, setBusError } from "../store/slices/busSlice";
import { sendHeartbeat } from "../services/api";

export const LocationScreen = () => {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.conductor.profile);
  const route = useAppSelector((state) => state.route.route);
  const status = useAppSelector((state) => state.bus.status);
  const [permissionMessage, setPermissionMessage] = useState(null);
  const [lastGps, setLastGps] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle"); // "idle" | "syncing" | "synced" | "queued"
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  const reportingRef = useRef(false);
  const stops = route?.stops ?? [];

  useEffect(() => {
    let active = true;
    let timer = null;

<<<<<<< HEAD
    // Capture the live GPS position and send it to the backend.
    const captureAndSend = async () => {
      // Skip duplicate in-flight reports and wait for a real bus id.
      if (!conductor?.busId || reportingRef.current) {
        return;
      }

      reportingRef.current = true;
      try {
        // Ask for device GPS permission only when we need a live fix.
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) {
          return;
        }

        if (permission.status !== "granted") {
          // Tell the user why live reporting cannot continue.
          setPermissionMessage(
            "GPS permission is required to report live location.",
          );
          return;
        }

        // Read the current device position and push it to the backend.
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const nextGps = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        // Keep the store in sync so other screens use the same live GPS.
        dispatch(setGps(nextGps));
        await dispatch(
          submitBusLocation({
            busId: conductor.busId,
            latitude: nextGps.latitude,
            longitude: nextGps.longitude,
            speed: Number.isFinite(position.coords.speed)
              ? Math.max(0, position.coords.speed)
              : 0,
            timestamp: new Date().toISOString(),
          }),
        ).unwrap();
        if (active) {
=======
    const captureAndSend = async () => {
      if (!profile?.shiftId && !profile?.shift) {
        setPermissionMessage("No active shift found. Please complete initialization first.");
        return;
      }
      if (reportingRef.current) return;

      reportingRef.current = true;
      setSyncStatus("syncing");

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) return;

        if (permission.status !== "granted") {
          setPermissionMessage("GPS permission is required to report live location.");
          setSyncStatus("idle");
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLastGps(coords);

        const payload = {
          shift_id: profile.shiftId || profile.shift || "shift-001",
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: Number.isFinite(position.coords.speed)
            ? Math.max(0, position.coords.speed)
            : 0,
          timestamp: new Date().toISOString(),
        };

        // Send to backend and update Redux with real ETA from PostGIS
        const result = await sendHeartbeat(payload);
        if (active) {
          dispatch(setBusStatus({
            current_stop: result.current_stop,
            next_stop: result.next_stop,
            eta_minutes: result.eta_minutes,
            condition: result.condition,
            speed: payload.speed,
          }));
          setSyncStatus("synced");
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
          setPermissionMessage(null);
        }
      } catch (error) {
        if (active) {
<<<<<<< HEAD
          // Show the immediate read/send failure so the user knows what to fix.
          setPermissionMessage(
            error instanceof Error
              ? error.message
              : "Unable to read GPS location.",
=======
          setSyncStatus("queued");
          dispatch(setBusError(error.message));
          setPermissionMessage(
            error instanceof Error ? error.message : "Unable to send GPS report."
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
          );
        }
      } finally {
        reportingRef.current = false;
      }
    };

    captureAndSend();
<<<<<<< HEAD
    // Re-send the live location every 30 seconds while the screen stays open.
    timer = setInterval(captureAndSend, 30000);
    // Re-report immediately when the app returns to the foreground.
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          captureAndSend();
        }
      },
    );

    return () => {
      active = false;
      if (timer) {
        clearInterval(timer);
      }
      appStateSubscription.remove();
    };
  }, [conductor?.busId, dispatch]);
=======
    // Re-send every 30 seconds while screen is open
    timer = setInterval(captureAndSend, 30000);

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") captureAndSend();
    });

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [dispatch, profile]);
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d

  return (
    <Screen>
      <Text style={styles.title}>Current Location</Text>
      <Text style={styles.subtitle}>
<<<<<<< HEAD
        Live GPS reporting to the backend every 30 seconds with offline retry.
      </Text>

      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Live route map</Text>
=======
        Live GPS reporting to the backend every 30 seconds.
      </Text>

      {/* Route Stop Visualization */}
      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Route stops</Text>
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
          <MaterialCommunityIcons
            name="map-marker-path"
            size={22}
            color={colors.light.primary}
          />
        </View>
        <View style={styles.routeTrack}>
<<<<<<< HEAD
          {stops.map((stop, index) => (
            <View key={stop.id} style={styles.stopRow}>
              <View
                style={[
                  styles.dot,
                  index <= Math.floor((progress / 100) * stops.length) &&
                    styles.dotActive,
                ]}
              />
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopDistance}>Stop {stop.index}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        {/* Present the current GPS point, sync status, and movement state together. */}
        <Text style={styles.label}>Current GPS location</Text>
        <Text style={styles.coords}>{locationLabel}</Text>
        <Text style={styles.meta}>Speed: {speed.toFixed(1)} m/s</Text>
        <Text style={styles.meta}>
          Movement: {speed > 0 ? "Moving" : "Stationary"}
        </Text>
        <Text style={styles.meta}>Sync: {syncStatus}</Text>
        {locationTimestamp ? (
          <Text style={styles.meta}>Last report: {locationTimestamp}</Text>
        ) : null}
        {permissionMessage ? (
          <Text style={[styles.meta, { color: colors.light.warning }]}>
            {permissionMessage}
          </Text>
        ) : null}
        <View style={{ marginTop: spacing.md }}>
          <Text style={styles.label}>Route progression</Text>
          <ProgressBar progress={progress} />
        </View>
=======
          {stops.length === 0 ? (
            <Text style={styles.emptyText}>No stops loaded — run Initializer first.</Text>
          ) : (
            stops.map((stop, index) => (
              <View key={stop.stop_id || stop.id || index} style={styles.stopRow}>
                <View
                  style={[
                    styles.dot,
                    stop.stop_name === status?.current_stop && styles.dotActive,
                  ]}
                />
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{stop.name || stop.stop_name}</Text>
                  <Text style={styles.stopDistance}>Stop {stop.index ?? index + 1}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Live GPS Data Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Current GPS location</Text>
        {lastGps ? (
          <Text style={styles.coords}>
            {lastGps.latitude.toFixed(5)}, {lastGps.longitude.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.coords}>Awaiting GPS fix...</Text>
        )}
        <Text style={styles.meta}>
          Current stop: {status?.current_stop ?? "—"}
        </Text>
        <Text style={styles.meta}>
          Next stop: {status?.next_stop ?? "—"}
        </Text>
        <Text style={styles.meta}>
          ETA: {status?.eta_minutes != null ? `${status.eta_minutes} min` : "—"}
        </Text>
        <Text style={styles.meta}>Sync: {syncStatus}</Text>

        {permissionMessage ? (
          <Text style={[styles.meta, { color: colors.light.danger ?? "#dc2626" }]}>
            {permissionMessage}
          </Text>
        ) : null}
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
      </View>
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
  mapCard: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapTitle: { color: colors.light.text, fontWeight: "800" },
  routeTrack: { marginTop: spacing.lg },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.light.border,
  },
  dotActive: { backgroundColor: colors.light.primary },
  stopInfo: { marginLeft: spacing.md },
  stopName: { color: colors.light.text, fontWeight: "700" },
  stopDistance: { color: colors.light.textMuted, fontSize: 12 },
<<<<<<< HEAD
=======
  emptyText: { color: colors.light.textMuted, fontStyle: "italic" },
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  label: { color: colors.light.text, fontWeight: "700" },
  coords: {
    color: colors.light.primary,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
  },
  meta: { color: colors.light.textMuted, marginTop: 8 },
});
