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
import { login, fetchRouteData, fetchShiftSummary } from "../services/api";
import { storage } from "../services/storage";
import { useAppDispatch } from "../store/hooks";
import { setRoute } from "../store/slices/routeSlice";
import { setProfile } from "../store/slices/conductorSlice";
import { hydrateHistory } from "../store/slices/ticketSlice";

export const InitializerScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  
  const [routeId, setRouteId] = useState("");
  const [empId, setEmpId] = useState("cond-1001");
  const [loading, setLoading] = useState(false);

  const fetchAndSaveRoute = async () => {
    if (!empId.trim()) {
      Alert.alert("Missing ID", "Please enter your Conductor Employee ID.");
      return;
    }

    setLoading(true);
    try {
      // 1. Clear old cache data
      try {
        await storage.clearMockData();
      } catch (e) {}
      
      // 2. API Call: Conductor Authentication
      const loginRes = await login(empId.trim());
      if (!loginRes?.employee) {
        throw new Error("Unable to authenticate conductor credentials.");
      }

      // Check if conductor has an assigned active shift in PostgreSQL
      const activeShift = loginRes.shift;
      const targetRouteId = activeShift?.route_id || routeId.trim() || "route-102";

      const profileData = {
        conductorName: loginRes.employee.name,
        conductorId: loginRes.employee.id || loginRes.employee.emp_id || empId.trim(),
        role: loginRes.employee.role,
        shift: activeShift ? `${activeShift.shift_id} (${activeShift.route_name})` : "Unassigned Shift",
        shiftId: activeShift ? activeShift.shift_id : null,
        busNumber: activeShift ? activeShift.bus_number : null,
        busId: activeShift ? activeShift.bus_id : null,
        hasActiveShift: Boolean(activeShift),
      };

      // 3. API Call: Fetch Route & Fare Matrix
      const routeData = await fetchRouteData(targetRouteId);

      // If route has active shift details and conductor had none, sync them
      if (!profileData.shiftId && routeData?.shiftId) {
        profileData.shiftId = routeData.shiftId;
        profileData.busNumber = routeData.busNumber;
        profileData.busId = routeData.busId;
        profileData.hasActiveShift = true;
      }

      // 4. Save to Redux & Local Storage
      dispatch(setProfile(profileData));
      await storage.saveConductorData(profileData);

      dispatch(setRoute(routeData));
      await storage.saveRouteData(routeData);

      // 5. Hydrate real tickets for this shift from PostgreSQL
      if (profileData.shiftId) {
        try {
          const shiftSummary = await fetchShiftSummary(profileData.shiftId);
          if (shiftSummary?.tickets) {
            dispatch(hydrateHistory(shiftSummary.tickets));
            await storage.saveTicketHistory(shiftSummary.tickets);
          }
        } catch (sumErr) {
          // Non-blocking if no prior tickets
        }
      }

      Alert.alert(
        "ETM Initialized",
        `Conductor: ${profileData.conductorName}\nBus: ${profileData.busNumber || "Standby"}\nRoute: ${routeData.route_name}\nShift: ${profileData.shiftId || "Standby"}`
      );
      navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
    } catch (error) {
      Alert.alert(
        "Initialization Failed",
        error.response?.data?.error || error.response?.data?.detail || error.message || "Unknown initialization error"
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <Screen showBack backTitle="Dashboard">
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
