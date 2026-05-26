// File: src/screens/SplashScreen.js
// Purpose: Loads cached or remote boot data before sending users into the app.
// Imports: bootstrap actions, animation, and theme constants.
// Behavior: On success it resets navigation to Dashboard; on timeout it falls back to cache.
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { BusAnimation } from "../components/BusAnimation";
import { radii, spacing } from "../constants/theme";
import { useAppDispatch } from "../store/hooks";
import { storage } from "../services/storage";
import { setProfile } from "../store/slices/conductorSlice";
import { setRoute } from "../store/slices/routeSlice";

export const SplashScreen = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [loadingText, setLoadingText] = useState("Checking local cache...");

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const cachedConductor = await storage.loadConductorData(null);
        const cachedRoute = await storage.loadRouteData(null);

        // Add a slight artificial delay for the animation to play
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!mounted) return;

        if (cachedConductor && cachedRoute) {
          setLoadingText("Restoring session...");
          dispatch(setProfile(cachedConductor));
          dispatch(setRoute(cachedRoute));
          
          navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
        } else {
          setLoadingText("No active session found.");
          navigation.reset({ index: 0, routes: [{ name: "Initializer" }] });
        }
      } catch (e) {
        if (!mounted) return;
        setLoadingText("Failed to read local cache.");
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: "Initializer" }] });
        }, 1500);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [dispatch, navigation]);

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
          <Text style={styles.loadingText}>
            {loadingText}
          </Text>
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
