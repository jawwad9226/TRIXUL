import React, { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";

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
  const reportingRef = useRef(false);
  const stops = route?.stops ?? [];

  useEffect(() => {
    let active = true;
    let timer = null;

    const captureAndSend = async () => {
      if (!conductor?.busId || reportingRef.current) {
        return;
      }

      reportingRef.current = true;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) {
          return;
        }

        if (permission.status !== "granted") {
          setPermissionMessage(
            "GPS permission is required to report live location.",
          );
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const nextGps = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
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
          setPermissionMessage(null);
        }
      } catch (error) {
        if (active) {
          setPermissionMessage(
            error instanceof Error
              ? error.message
              : "Unable to read GPS location.",
          );
        }
      } finally {
        reportingRef.current = false;
      }
    };

    captureAndSend();
    timer = setInterval(captureAndSend, 30000);
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

  return (
    <Screen>
      <Text style={styles.title}>Current Location</Text>
      <Text style={styles.subtitle}>
        Live GPS reporting to the backend every 30 seconds with offline retry.
      </Text>

      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>Live route map</Text>
          <MaterialCommunityIcons
            name="map-marker-path"
            size={22}
            color={colors.light.primary}
          />
        </View>
        <View style={styles.routeTrack}>
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
        <Text style={styles.label}>Current GPS location</Text>
        <Text style={styles.coords}>{locationLabel}</Text>
        <Text style={styles.meta}>Speed: {speed.toFixed(1)} m/s</Text>
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
