// File: src/screens/SplashScreen.js
// Purpose: Loads cached or remote boot data before sending users into the app.
// Imports: bootstrap actions, animation, and theme constants.
// Behavior: On success it resets navigation to Dashboard; on timeout it falls back to cache.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { BusAnimation } from "../components/BusAnimation";
import { colors, radii, spacing } from "../constants/theme";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { bootstrapConductor } from "../store/slices/conductorSlice";
import { bootstrapRoute } from "../store/slices/routeSlice";

export const SplashScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const conductor = useAppSelector((state) => state.conductor.profile);
  const route = useAppSelector((state) => state.route.route);
  const refreshRequired = useAppSelector(
    (state) => state.route.refreshRequired,
  );

  useEffect(() => {
    let mounted = true;
    let watchdog = null;

    const load = async () => {
      await Promise.all([
        dispatch(bootstrapConductor({ forceRemote: refreshRequired })),
        dispatch(bootstrapRoute({ forceRemote: refreshRequired })),
      ]);
      if (mounted) {
        setReady(true);
      }
    };

    load();

    // if remote fetch stalls, fallback to cached data after 6s
    watchdog = setTimeout(async () => {
      if (!mounted) return;
      console.log("Splash: remote load timed out — falling back to cache");
      setTimedOut(true);
      await Promise.all([
        dispatch(bootstrapConductor({ forceRemote: false })),
        dispatch(bootstrapRoute({ forceRemote: false })),
      ]);
      if (mounted) setReady(true);
    }, 6000);

    return () => {
      mounted = false;
      if (watchdog) clearTimeout(watchdog);
    };
  }, [dispatch, refreshRequired]);

  useEffect(() => {
    if (ready && conductor && route) {
      navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
    }
  }, [conductor, navigation, ready, route]);

  return (
    <LinearGradient
      colors={["#07111f", "#0b1f33", "#091827"]}
      style={styles.root}
    >
      <View style={styles.card}>
        <BusAnimation />
        <Text style={styles.title}>Trixual ETM</Text>
        <Text style={styles.subtitle}>
          Electronic Ticket Machine for smart public transport operations
        </Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.light.primary} />
          <Text style={styles.loadingText}>
            {timedOut
              ? "Unable to reach API — loading cached data"
              : "Synchronizing conductor profile and route data..."}
          </Text>
          {timedOut ? (
            <Pressable
              onPress={() => {
                // allow user to retry full remote load by reloading the app flow
                console.log("Splash: user requested retry");
                // resetting refreshRequired to true will force remote next run
                dispatch({ type: "route/setRefreshRequired", payload: true });
                // keep ready=false so navigator doesn't switch until retry completes
              }}
              style={{ marginLeft: 12 }}
            >
              <Text style={{ color: colors.light.primary, fontWeight: "700" }}>
                Retry
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#ffffff0d",
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#d9e4f5",
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  loadingText: { color: "#d9e4f5", marginLeft: 10 },
});
