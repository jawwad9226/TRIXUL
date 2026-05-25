# Flow & Comment Guide

This document lists the main screens, components, store slices, and services in the project, provides a short human-readable description for each, and includes a small header-comment template you can copy into any file.

Why I split the flow instead of a single monolithic file

- Single-file flow configs are easy to edit but create a large blast radius for small changes. Splitting concerns keeps:
  - Navigation (startup route) in `src/constants/flow/navigation.js`
  - Security/verification codes in `src/constants/flow/security.js`
  - Visual labels in `src/constants/flow/labels.js`
  - Screen/component registry in `src/navigation/appRegistry.js`

  This separation makes it safe to change, for example, the verification code without touching navigation or screen wiring. It also helps code owners work in parallel and keeps runtime imports smaller.

## Header comment template (copy into the top of a file)

// File: <path/to/file>
// Purpose: One-line summary of what this file does.
// Where to change: One-line where to edit behavior or key dependencies.
// Flow: Which flow/config files affect this (e.g., `src/navigation/appRegistry.js`).
// Tips: Short tip for maintainers.

Main files and quick notes

- `src/navigation/appRegistry.js` — Single registry of screen names and components. Add new screens here first.
- `src/navigation/RootNavigator.js` — Reads the registry and creates stack screens. Edit startup route in `src/constants/flow/navigation.js`.
- `App.js` — App bootstrap: Provider, NavigationContainer, Theme wiring.

Screens

- `src/screens/SplashScreen.js` — bootstrap tasks, calls `bootstrapConductor` and `bootstrapRoute`.
- `src/screens/DashboardScreen.js` — dashboard cards and telemetry summary.
- `src/screens/InitializerScreen.js` — route editing; verification via `src/constants/flow/security.js`.
- `src/screens/TicketBookingScreen.js` — ticket flow; fare logic in `src/utils/fare.js`.
- `src/screens/BusStatusScreen.js` — current bus telemetry.
- `src/screens/LocationScreen.js` — map/progression display.
- `src/screens/OtherBusRoutesScreen.js` — other buses list.
- `src/screens/UpdatesScreen.js` — admin/conductor updates.
- `src/screens/EmergencyAlertScreen.js` — emergency submission.
- `src/screens/TicketHistoryScreen.js` — local ticket list read from storage.

Components

- `src/components/Screen.js` — safe area + consistent background.
- `src/components/AppCard.js` — dashboard card element.
- `src/components/Field.js` — labeled input.
- `src/components/PrimaryButton.js` — primary action button.
- `src/components/ProgressBar.js` — route progress visuals.
- `src/components/TicketTile.js` — ticket item in history.
- `src/components/BusAnimation.js` — splash animation.

Store slices and services

- `src/store/slices/conductorSlice.js` — conductor profile bootstrap.
- `src/store/slices/routeSlice.js` — current route and edits.
- `src/store/slices/ticketSlice.js` — ticket drafts, booking, payments.
- `src/store/slices/busSlice.js` — telemetry and active buses.
- `src/store/slices/updateSlice.js` — updates list.
- `src/store/slices/alertSlice.js` — emergency alerts.
- `src/services/mockApi.js` — live API adapter and local persistence bridge.
- `src/services/storage.js` — AsyncStorage wrapper; persistence keys live here.

How I can proceed (pick one)

- I can automatically insert this header template into every file listed above.
- Or I can add the header only to a smaller subset you care most about (e.g., screens + slices).

If you want me to apply the headers automatically, tell me to proceed and I'll add them to the files listed. If you'd rather add them manually, use the template above and paste it at the top of the target files.
