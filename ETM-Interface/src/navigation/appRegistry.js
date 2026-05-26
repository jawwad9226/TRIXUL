// File: src/navigation/appRegistry.js
// Purpose: Central map between route names and screen components.
// Imports: Every screen component listed in this registry.
// Behavior: Navigation uses this file to decide what screen name opens which UI.
import { DashboardScreen } from "../screens/DashboardScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { InitializerScreen } from "../screens/InitializerScreen";
import { TicketBookingScreen } from "../screens/TicketBookingScreen";
import { BusStatusScreen } from "../screens/BusStatusScreen";
import { LocationScreen } from "../screens/LocationScreen";
import { OtherBusRoutesScreen } from "../screens/OtherBusRoutesScreen";
import { UpdatesScreen } from "../screens/UpdatesScreen";
import { EmergencyAlertScreen } from "../screens/EmergencyAlertScreen";
import { TicketHistoryScreen } from "../screens/TicketHistoryScreen";

// This file is the app map: every screen, its component, and its order live here.
// Add a new screen here first, then point the navigator to this registry.
export const appScreenRegistry = [
  {
    name: "Splash",
    label: "Splash",
    component: SplashScreen,
  },
  {
    name: "Dashboard",
    label: "Dashboard",
    component: DashboardScreen,
  },
  {
    name: "Initializer",
    label: "Initializer",
    component: InitializerScreen,
  },
  {
    name: "TicketBooking",
    label: "Ticket Booking",
    component: TicketBookingScreen,
  },
  {
    name: "BusStatus",
    label: "Current Bus Status",
    component: BusStatusScreen,
  },
  {
    name: "Location",
    label: "Current Location",
    component: LocationScreen,
  },
  {
    name: "OtherBusRoutes",
    label: "Other Bus Routes",
    component: OtherBusRoutesScreen,
  },
  {
    name: "Updates",
    label: "Updates",
    component: UpdatesScreen,
  },
  {
    name: "EmergencyAlert",
    label: "Emergency Alert",
    component: EmergencyAlertScreen,
  },
  {
    name: "TicketHistory",
    label: "Ticket History",
    component: TicketHistoryScreen,
  },
];

export const appScreenNames = appScreenRegistry.map((screen) => screen.name);
