import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "../constants/theme";

export const BusAnimation = () => {
  const slide = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(slide, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(slide, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.75,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [pulse, slide]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.signal, { opacity: pulse }]}>
        <MaterialCommunityIcons
          name="wifi"
          size={18}
          color={colors.light.primary}
        />
        <Text style={styles.signalText}>Signal stable</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.bus,
          {
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 10],
                }),
              },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="bus-side"
          size={48}
          color={colors.light.primary}
        />
      </Animated.View>
      <Text style={styles.label}>Smart ETM booting conductor profile</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 32 },
  signal: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  signalText: { color: colors.light.text, marginLeft: 8, fontWeight: "700" },
  bus: { padding: 18, borderRadius: 28, backgroundColor: "#ffffff14" },
  label: { color: colors.light.textMuted, marginTop: 18, textAlign: "center" },
});
