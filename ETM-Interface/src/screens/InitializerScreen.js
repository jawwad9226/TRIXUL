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

export const InitializerScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
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
