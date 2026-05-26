// File: App.js
// Purpose: Bootstraps providers, theme wiring, and the root navigator.
// Imports: store, theme constants, and RootNavigator.
// Behavior: Changing this file changes the app shell for every screen.
import "react-native-gesture-handler";

import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";

import { store } from "./src/store";
import { navigationTheme } from "./src/constants/theme";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  // This keeps the app theme in sync with the phone's dark/light mode.
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    // Provider gives every screen access to the Redux state.
    <Provider store={store}>
      {/* Gesture handler is required by React Navigation on Android/iOS. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* SafeAreaProvider prevents content from overlapping notches and status bars. */}
        <SafeAreaProvider>
          {/* NavigationContainer owns the screen flow and route history. */}
          <NavigationContainer
            theme={{
              ...theme,
              colors: {
                ...theme.colors,
                ...navigationTheme[scheme === "dark" ? "dark" : "light"],
              },
            }}
          >
            {/* StatusBar is updated to match the active theme. */}
            <StatusBar style={scheme === "dark" ? "light" : "dark"} />
            {/* RootNavigator lists the full app flow. */}
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}
