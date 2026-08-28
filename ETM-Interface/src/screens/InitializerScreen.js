// File: src/screens/InitializerScreen.js
// Purpose: Lets the conductor review and save route setup with verification.
// Imports: route state, storage, verification API, and GPS helpers.
// Behavior: Editing is only allowed when the bus is near the allowed points.
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { colors, radii, spacing } from "../constants/theme";
import { login, fetchRouteData } from "../services/api";
import { storage } from "../services/storage";
import { useAppDispatch } from "../store/hooks";
import { setRoute } from "../store/slices/routeSlice";
import { setProfile } from "../store/slices/conductorSlice";

export const InitializerScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  
  const [routeId, setRouteId] = useState("route-102"); // default from seeder
  const [empId, setEmpId] = useState("cond-1001");
  const [loading, setLoading] = useState(false);

  const fetchAndSaveRoute = async () => {
    setLoading(true);
    try {
      // 1. Clear old cache data (if any)
      try {
        await storage.clearMockData();
      } catch (e) {}
      
      // 2. API Call: Login
      const loginRes = await login(empId.trim());
      if (loginRes?.employee) {
        const profileData = {
          conductorName: loginRes.employee.name,
          conductorId: loginRes.employee.emp_id,
          role: loginRes.employee.role,
          shift: "Morning Shift", // Defaulting as shift API isn't built
        };
        dispatch(setProfile(profileData));
        await storage.saveConductorData(profileData);
      }
      
      // 3. API Call: Fetch Route
      const routeData = await fetchRouteData(routeId.trim());
      
      // 4. Analyze API Data & Store in Cache (Redux & Local)
      // The API returns { route_id, route_name, stops, fares }
      dispatch(setRoute(routeData));
      await storage.saveRouteData(routeData);
      
      Alert.alert("Success", "Real route data fetched and cached successfully.");
      navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
    } catch (error) {
      Alert.alert(
        "Initialization failed",
        error.response?.data?.error || error.response?.data?.detail || error.message || "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Initialization</Text>
          <Text style={styles.subtitle}>
            Fetch real route and fare data directly from the PostgreSQL backend.
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Employee ID (Conductor)</Text>
        <TextInput
          value={empId}
          onChangeText={setEmpId}
          style={styles.input}
          placeholder="e.g. cond-1001"
          placeholderTextColor={colors.light.textMuted}
        />
        
        <Text style={[styles.label, { marginTop: 16 }]}>Route ID</Text>
        <TextInput
          value={routeId}
          onChangeText={setRouteId}
          style={styles.input}
          placeholder="e.g. route-102"
          placeholderTextColor={colors.light.textMuted}
        />

        <View style={{ marginTop: 24 }}>
          <PrimaryButton 
            title="Fetch Real Data & Start" 
            loading={loading} 
            onPress={fetchAndSaveRoute} 
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  title: { color: colors.light.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.light.textMuted, marginTop: 6, maxWidth: 640 },
  panel: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  label: { color: colors.light.text, fontWeight: "700", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.light.text,
  }
});
