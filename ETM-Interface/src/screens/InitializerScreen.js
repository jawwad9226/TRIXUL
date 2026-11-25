// File: src/screens/InitializerScreen.js
// Purpose: Lets the conductor review and save route setup with verification.
// Imports: route state, storage, verification API, and GPS helpers.
// Behavior: Editing is only allowed when the bus is near the allowed points.
import React, { useState } from "react";
import { Alert, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { Field } from "../components/Field";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
<<<<<<< HEAD
import { mockApi } from "../services/mockApi";
=======
import { login, fetchRouteData, fetchShiftSummary } from "../services/api";
>>>>>>> origin/main
import { storage } from "../services/storage";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  updateRoute,
  setRoute,
  setRefreshRequired,
} from "../store/slices/routeSlice";
import { setProfile } from "../store/slices/conductorSlice";
<<<<<<< HEAD
import { isNearPoint } from "../utils/gps";
=======
import { hydrateHistory } from "../store/slices/ticketSlice";
>>>>>>> origin/main

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
      );
    }
  };

  return (
=======
  
  const [routeId, setRouteId] = useState("");
  const [empId, setEmpId] = useState("cond-1001");
  const [loading, setLoading] = useState(false);

  const fetchAndSaveRoute = async () => {
    if (!empId.trim()) {
      Alert.alert("Missing ID", "Please enter your Conductor Employee ID.");
      return;
    }

>>>>>>> origin/main
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
<<<<<<< HEAD
        "Initialization failed",
        error.message || "Unknown error"
=======
        "Initialization Failed",
        error.response?.data?.error || error.response?.data?.detail || error.message || "Unknown initialization error"
>>>>>>> origin/main
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <Screen showBack backTitle="Dashboard">
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Initializer Module</Text>
          <Text style={styles.subtitle}>
            Secure route setup with GPS validation and conductor verification.
          </Text>
        </View>
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: { color: colors.light.text, fontSize: 24, fontWeight: "900" },
  subtitle: { color: colors.light.textMuted, marginTop: 6, maxWidth: 640 },
  panel: {
    backgroundColor: colors.light.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  label: { color: colors.light.text, fontWeight: "700", marginBottom: 8 },
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
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    color: colors.light.text,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
