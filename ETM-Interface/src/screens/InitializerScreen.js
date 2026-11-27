// File: src/screens/InitializerScreen.js
// Purpose: Lets the conductor authenticate, review their assigned duty shift & route, or self-dispatch ad-hoc duty.
// Behavior: Guarantees every active duty has an authentic PostgreSQL shift, 100% trackable on Admin Dashboard.
import React, { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View, TextInput, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors, radii, spacing } from "../constants/theme";
import {
  login,
  fetchRouteData,
  fetchShiftSummary,
  fetchDispatchOptions,
  selfDispatchShift,
} from "../services/api";
import { storage } from "../services/storage";
import { useAppDispatch } from "../store/hooks";
import { setRoute } from "../store/slices/routeSlice";
import { setProfile } from "../store/slices/conductorSlice";
import { hydrateHistory } from "../store/slices/ticketSlice";

export const InitializerScreen = () => {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const isDark = scheme === "dark";
  const theme = colors[scheme];

  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const [empId, setEmpId] = useState("cond-1001");
  const [loading, setLoading] = useState(false);
  const [dutyReview, setDutyReview] = useState(null);

  // Self-dispatch selections
  const [selectedBusId, setSelectedBusId] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");

  // Step 1: Verify Conductor credentials and check PostgreSQL for assigned shift
  const checkShiftAssignment = async () => {
    if (!empId.trim()) {
      Alert.alert("Missing ID", "Please enter your Conductor Employee ID.");
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate Conductor
      const loginRes = await login(empId.trim());
      if (!loginRes?.employee) {
        throw new Error("Unable to authenticate conductor credentials.");
      }

      const activeShift = loginRes.shift;

      if (activeShift) {
        // Case A: Real active shift dispatched by Admin in PostgreSQL
        const routeData = await fetchRouteData(activeShift.route_id);
        const profileData = {
          conductorName: loginRes.employee.name,
          conductorId: loginRes.employee.id || loginRes.employee.emp_id || empId.trim(),
          role: loginRes.employee.role,
          shift: `${activeShift.shift_id} (${activeShift.route_name})`,
          shiftId: activeShift.shift_id,
          busNumber: activeShift.bus_number,
          busId: activeShift.bus_id,
          hasActiveShift: true,
        };

        setDutyReview({
          type: "assigned",
          employee: loginRes.employee,
          shift: activeShift,
          routeData,
          profileData,
        });
      } else {
        // Case B: No active shift dispatched yet in PostgreSQL
        const optionsRes = await fetchDispatchOptions();
        const buses = optionsRes?.buses || [];
        const routes = optionsRes?.routes || [];

        setSelectedBusId(buses[0]?.bus_id || "bus-101");
        setSelectedRouteId(routes[0]?.route_id || "route-102");

        setDutyReview({
          type: "unassigned",
          employee: loginRes.employee,
          buses,
          routes,
        });
      }
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.detail || error.message || "Unknown error";
      Alert.alert("Verification Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Accept Already-Dispatched Shift
  const acceptAssignedShift = async () => {
    if (!dutyReview?.profileData || !dutyReview?.routeData) return;
    setLoading(true);

    try {
      try {
        await storage.clearMockData();
      } catch (e) {}

      const { profileData, routeData } = dutyReview;

      dispatch(setProfile(profileData));
      await storage.saveConductorData(profileData);

      dispatch(setRoute(routeData));
      await storage.saveRouteData(routeData);

      // Hydrate prior tickets if any
      if (profileData.shiftId) {
        try {
          const shiftSummary = await fetchShiftSummary(profileData.shiftId);
          if (shiftSummary?.tickets) {
            dispatch(hydrateHistory(shiftSummary.tickets));
            await storage.saveTicketHistory(shiftSummary.tickets);
          }
        } catch (sumErr) {}
      }

      navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
    } catch (error) {
      Alert.alert("Duty Start Failed", error.message || "Failed to initialize duty session");
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Self-Dispatch Shift on ETM (Creates REAL active Shift in PostgreSQL)
  const handleSelfDispatch = async () => {
    if (!selectedBusId || !selectedRouteId) {
      Alert.alert("Incomplete Selection", "Please select a Bus and Route to dispatch.");
      return;
    }

    setLoading(true);
    try {
      try {
        await storage.clearMockData();
      } catch (e) {}

      // 1. Post to Backend: Creates authentic Shift in PostgreSQL
      const dispatchRes = await selfDispatchShift({
        emp_id: empId.trim(),
        bus_id: selectedBusId,
        route_id: selectedRouteId,
      });

      if (!dispatchRes?.shift_id) {
        throw new Error(dispatchRes?.message || "Failed to create active shift in database.");
      }

      // 2. Fetch full Route Data & Stops
      const routeData = await fetchRouteData(selectedRouteId);

      const profileData = {
        conductorName: dutyReview.employee.name,
        conductorId: dutyReview.employee.id || dutyReview.employee.emp_id || empId.trim(),
        role: dutyReview.employee.role,
        shift: `${dispatchRes.shift_id} (${dispatchRes.route || routeData.route_name})`,
        shiftId: dispatchRes.shift_id,
        busNumber: dispatchRes.bus_number,
        busId: selectedBusId,
        hasActiveShift: true,
      };

      // 3. Save to Redux & Local Storage
      dispatch(setProfile(profileData));
      await storage.saveConductorData(profileData);

      dispatch(setRoute(routeData));
      await storage.saveRouteData(routeData);

      const notice = `Shift #${dispatchRes.shift_id} activated.\nBus: ${dispatchRes.bus_number}\nRoute: ${routeData.route_name}\nTrackable immediately on Admin Command Center.`;
      if (Platform.OS === "web") {
        window.alert(`Duty Shift Activated\n\n${notice}`);
      } else {
        Alert.alert("Duty Shift Activated", notice);
      }

      navigation.reset({ index: 0, routes: [{ name: "Splash" }] });
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || "Self-dispatch failed";
      Alert.alert("Dispatch Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen showBack backTitle="Dashboard">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Duty Shift Initialization</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Verify conductor credentials and synchronize active duty with central depot dispatch.
        </Text>
      </View>

      {!dutyReview ? (
        /* Step 1: Conductor Login */
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.text }]}>Conductor Employee ID</Text>
          <TextInput
            value={empId}
            onChangeText={setEmpId}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.surfaceAlt,
              },
            ]}
            placeholder="e.g. cond-1001"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />

          <View style={{ marginTop: 24 }}>
            <PrimaryButton
              title="Verify Conductor & Fetch Duty"
              loading={loading}
              onPress={checkShiftAssignment}
            />
          </View>
        </View>
      ) : dutyReview.type === "assigned" ? (
        /* Step 2A: Review & Accept Already-Dispatched Shift */
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.reviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: theme.primary }]}>ASSIGNED DUTY DETAILS</Text>
              <Text style={[styles.reviewTitle, { color: theme.text }]}>
                {dutyReview.employee.name}
              </Text>
              <Text style={[styles.reviewSub, { color: theme.textMuted }]}>
                Employee ID: {dutyReview.employee.id || dutyReview.employee.emp_id} • Role: {dutyReview.employee.role}
              </Text>
            </View>
            <StatusBadge label="ASSIGNED SHIFT" tone="success" />
          </View>

          {/* Metadata Card */}
          <View style={[styles.metaBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>SHIFT ID</Text>
                <Text style={[styles.metaVal, { color: theme.text }]}>{dutyReview.shift.shift_id}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>ASSIGNED BUS</Text>
                <Text style={[styles.metaVal, { color: theme.text }]}>{dutyReview.shift.bus_number}</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>ROUTE NAME</Text>
                <Text style={[styles.metaVal, { color: theme.text }]}>
                  {dutyReview.routeData?.route_name || dutyReview.shift.route_name}
                </Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, { color: theme.textMuted }]}>TOTAL STOPS</Text>
                <Text style={[styles.metaVal, { color: theme.text }]}>
                  {dutyReview.routeData?.stops?.length || 0} Stations
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoBanner, { backgroundColor: isDark ? "#10233b" : "#e8f0fe", borderColor: theme.primary }]}>
            <MaterialCommunityIcons name="broadcast" size={20} color={theme.primary} />
            <Text style={[styles.infoBannerText, { color: theme.text }]}>
              Accepting this duty automatically begins live GPS telemetry broadcasting to depot dispatch every 10 seconds.
            </Text>
          </View>

          <View style={{ marginTop: 24, gap: 12 }}>
            <PrimaryButton
              title="Accept Shift & Start Duty"
              loading={loading}
              onPress={acceptAssignedShift}
            />

            <Pressable
              onPress={() => setDutyReview(null)}
              style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>
                Change Conductor / Re-enter ID
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* Step 2B: No Shift Dispatched — Depot Refresh OR Real Self-Dispatch */
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.reviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.light.warning }]}>NO DISPATCHED SHIFT</Text>
              <Text style={[styles.reviewTitle, { color: theme.text }]}>
                {dutyReview.employee.name}
              </Text>
              <Text style={[styles.reviewSub, { color: theme.textMuted }]}>
                Employee ID: {dutyReview.employee.id || dutyReview.employee.emp_id} • Conductor
              </Text>
            </View>
            <StatusBadge label="NO SHIFT" tone="warning" />
          </View>

          <View style={[styles.warningBox, { backgroundColor: isDark ? "#2a1c0d" : "#fef3c7", borderColor: "#d97706" }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#d97706" />
            <Text style={[styles.warningText, { color: isDark ? "#fde68a" : "#92400e" }]}>
              No active shift has been assigned by the depot dispatcher for this conductor. You can check for a newly dispatched shift or activate an ad-hoc shift below.
            </Text>
          </View>

          {/* Section: Self-Dispatch Dropdowns */}
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Activate Ad-Hoc Duty Shift (Creates Live PostgreSQL Record)
          </Text>

          {/* Bus Dropdown */}
          <Text style={[styles.label, { color: theme.text, marginTop: 12 }]}>Select Bus</Text>
          <View style={[styles.selectBox, { backgroundColor: isDark ? "#1e293b" : "#f8fafc", borderColor: theme.border }]}>
            <Picker
              selectedValue={selectedBusId}
              onValueChange={setSelectedBusId}
              style={[styles.picker, { color: isDark ? "#f8fafc" : "#0f172a", backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}
              dropdownIconColor={isDark ? "#f8fafc" : "#0f172a"}
            >
              {dutyReview.buses.map((b) => (
                <Picker.Item
                  key={b.bus_id}
                  label={`${b.registration_number} (${b.bus_id}) • Capacity ${b.capacity_total || 56}`}
                  value={b.bus_id}
                  style={{ backgroundColor: isDark ? "#1e293b" : "#ffffff", color: isDark ? "#f8fafc" : "#0f172a" }}
                />
              ))}
            </Picker>
          </View>

          {/* Route Dropdown */}
          <Text style={[styles.label, { color: theme.text, marginTop: 14 }]}>Select Route</Text>
          <View style={[styles.selectBox, { backgroundColor: isDark ? "#1e293b" : "#f8fafc", borderColor: theme.border }]}>
            <Picker
              selectedValue={selectedRouteId}
              onValueChange={setSelectedRouteId}
              style={[styles.picker, { color: isDark ? "#f8fafc" : "#0f172a", backgroundColor: isDark ? "#1e293b" : "#f8fafc" }]}
              dropdownIconColor={isDark ? "#f8fafc" : "#0f172a"}
            >
              {dutyReview.routes.map((r) => (
                <Picker.Item
                  key={r.route_id}
                  label={`${r.route_name} (${r.route_id})`}
                  value={r.route_id}
                  style={{ backgroundColor: isDark ? "#1e293b" : "#ffffff", color: isDark ? "#f8fafc" : "#0f172a" }}
                />
              ))}
            </Picker>
          </View>

          {/* Actions */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <PrimaryButton
              title="🚀 Dispatch Shift & Begin Duty"
              loading={loading}
              onPress={handleSelfDispatch}
            />

            <Pressable
              onPress={checkShiftAssignment}
              style={[styles.refreshBtn, { borderColor: theme.primary, backgroundColor: isDark ? "#14253d" : "#eff6ff" }]}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={theme.primary} />
              <Text style={[styles.refreshBtnText, { color: theme.primary }]}>
                Check Depot Dispatch (Refresh)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setDutyReview(null)}
              style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>
                Change Conductor / Re-enter ID
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 6, maxWidth: 640, fontSize: 14 },
  panel: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
  },
  label: { fontWeight: "700", marginBottom: 8, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 15,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
  },
  reviewSub: {
    fontSize: 13,
    marginTop: 2,
  },
  metaBox: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metaVal: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  selectBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
  },
  refreshBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
