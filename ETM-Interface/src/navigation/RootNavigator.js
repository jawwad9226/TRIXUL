// File: src/navigation/RootNavigator.js
// Purpose: Converts the screen registry into the app's stack navigator.
// Imports: appNavigationFlow and appScreenRegistry.
// Behavior: Registry changes alter routes; flow changes alter the startup screen.
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { appNavigationFlow } from "../constants/flow/navigation";
import { appScreenRegistry } from "./appRegistry";

const Stack = createNativeStackNavigator();

export const RootNavigator = () => (
  // Edit `src/navigation/appRegistry.js` to change screens/components.
  // Edit `src/constants/flow/navigation.js` to change startup route and screen order.
  <Stack.Navigator
    screenOptions={{ headerShown: false }}
    initialRouteName={appNavigationFlow.initialRouteName}
  >
    {appScreenRegistry.map((screen) => (
      <Stack.Screen
        key={screen.name}
        name={screen.name}
        component={screen.component}
      />
    ))}
  </Stack.Navigator>
);
