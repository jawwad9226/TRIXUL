// File: src/screens/InitializerScreen.js
// Purpose: Lets the conductor review and save route setup with verification.
// Imports: route state, storage, verification API, and GPS helpers.
// Behavior: Editing is only allowed when the bus is near the allowed points.
import React, { useState } from "react";
<<<<<<< HEAD
import { Alert, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { Field } from "../components/Field";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import { mockApi } from "../services/mockApi";
import { storage } from "../services/storage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  updateRoute,
  setRoute,
  setRefreshRequired,
} from "../store/slices/routeSlice";
import { setProfile } from "../store/slices/conductorSlice";
import { isNearPoint } from "../utils/gps";
=======
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
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d

export const InitializerScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
<<<<<<< HEAD
  const route = useAppSelector((state) => state.route.route);
  const currentGps = useAppSelector((state) => state.route.currentGps);
  const stops = route?.stops ?? [];
  const [draft, setDraft] = useState({
    busNumber: route?.busNumber ?? "",
    startingPoint: route?.startingPoint ?? "",
    endingPoint: route?.endingPoint ?? "",
    routeName: route?.routeName ?? "",
    busType: route?.busType ?? "Express",
  });
  const [codeModal, setCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!route) {
    return (
      <Screen>
        <Text style={styles.title}>Initializer Module</Text>
        <Text style={styles.subtitle}>Route data is not ready yet.</Text>
      </Screen>
    );
  }

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];
  const canEdit = Boolean(
    firstStop &&
    lastStop &&
    (isNearPoint(currentGps, firstStop.coordinate) ||
      isNearPoint(currentGps, lastStop.coordinate)),
  );

  const saveRoute = async () => {
    if (!canEdit) {
      Alert.alert(
        "Edit blocked",
        "The bus must be near the start or end point to edit route details.",
      );
      return;
    }
    setCodeModal(true);
  };

  const verifyAndSave = async () => {
    setLoading(true);
    try {
      const result = await mockApi.verifyInitializerCode(
        verificationCode.trim(),
      );
      if (!result.valid) {
        Alert.alert("Verification failed", "Invalid verification code.");
        return;
      }

      const nextRoute = { ...route, ...draft };
      dispatch(updateRoute(nextRoute));
      await storage.saveRouteDraft(nextRoute);
      try {
        await mockApi.clearMockCache();
        dispatch(setRefreshRequired(true));
        dispatch(setRoute(null));
        dispatch(setProfile(null));

        setCodeModal(false);
        navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
        return;
      } catch (e) {
        // if cache reset fails, keep local route draft and continue
      }
      setCodeModal(false);
      Alert.alert("Route saved", "Initializer details updated successfully.");
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Unknown error",
=======
  
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
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
<<<<<<< HEAD
          <Text style={styles.title}>Initializer Module</Text>
          <Text style={styles.subtitle}>
            Secure route setup with GPS validation and conductor verification.
          </Text>
        </View>
        <StatusBadge
          label={canEdit ? "EDIT ALLOWED" : "EDIT LOCKED"}
          tone={canEdit ? "success" : "danger"}
        />
      </View>

      <View style={styles.panel}>
        <Field
          label="Bus Number"
          value={draft.busNumber}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, busNumber: value }))
          }
        />
        <Field
          label="Starting Point"
          value={draft.startingPoint}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, startingPoint: value }))
          }
        />
        <Field
          label="Ending Point"
          value={draft.endingPoint}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, endingPoint: value }))
          }
        />
        <Field
          label="Route Name"
          value={draft.routeName}
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, routeName: value }))
          }
        />
        <Text style={styles.label}>Bus Type</Text>
        <View style={styles.typeRow}>
          {["Ordinary", "Super", "Direct", "Express"].map((type) => (
            <Text
              key={type}
              style={[
                styles.typeChip,
                draft.busType === type && styles.typeChipActive,
              ]}
              onPress={() =>
                setDraft((current) => ({ ...current, busType: type }))
              }
            >
              {type}
            </Text>
          ))}
        </View>
        <PrimaryButton title="Save Route Details" onPress={saveRoute} />
      </View>

      <Modal visible={codeModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons
              name="shield-key-outline"
              size={44}
              color={colors.light.primary}
            />
            <Text style={styles.modalTitle}>Verification Required</Text>
            <Text style={styles.modalText}>
              Enter the conductor verification code to authorize route changes.
            </Text>
            <TextInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Enter code"
              placeholderTextColor={colors.light.textMuted}
              style={styles.codeInput}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                title="Cancel"
                tone="secondary"
                onPress={() => setCodeModal(false)}
              />
              <PrimaryButton
                title="Validate"
                loading={loading}
                onPress={verifyAndSave}
              />
            </View>
          </View>
        </View>
      </Modal>
=======
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
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
    </Screen>
  );
};

const styles = StyleSheet.create({
<<<<<<< HEAD
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
=======
  header: { marginBottom: spacing.lg },
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  title: { color: colors.light.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.light.textMuted, marginTop: 6, maxWidth: 640 },
  panel: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  label: { color: colors.light.text, fontWeight: "700", marginBottom: 8 },
<<<<<<< HEAD
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.xl,
    backgroundColor: colors.light.surfaceAlt,
    color: colors.light.text,
    overflow: "hidden",
  },
  typeChipActive: { backgroundColor: colors.light.primary, color: "#fff" },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000080",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.light.text,
    marginTop: spacing.md,
  },
  modalText: { color: colors.light.textMuted, marginTop: spacing.sm },
  codeInput: {
=======
  input: {
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    padding: spacing.md,
<<<<<<< HEAD
    marginTop: spacing.lg,
    color: colors.light.text,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
=======
    color: colors.light.text,
  }
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
});
