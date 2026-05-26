# ETM Interface Flow Diagram

```mermaid
graph TD
	A[App.js\nBootstraps Provider, NavigationContainer, theme, and RootNavigator] --> B[RootNavigator.js\nReads appNavigationFlow and appScreenRegistry]
	B --> C[appRegistry.js\nMaps route names to screen components]

	B --> D1[SplashScreen]
	B --> D2[DashboardScreen]
	B --> D3[InitializerScreen]
	B --> D4[TicketBookingScreen]
	B --> D5[BusStatusScreen]
	B --> D6[LocationScreen]
	B --> D7[OtherBusRoutesScreen]
	B --> D8[UpdatesScreen]
	B --> D9[EmergencyAlertScreen]
	B --> D10[TicketHistoryScreen]

	subgraph Shared_UI[Shared UI Components]
		U1[Screen]
		U2[AppCard]
		U3[Field]
		U4[PrimaryButton]
		U5[ProgressBar]
		U6[TicketTile]
		U7[BusAnimation]
		U8[MetricPill]
		U9[StatusBadge]
		U10[SectionHeader]
		U11[EmptyState]
	end

	subgraph Store[Redux Store]
		S0[store/index.js\nCombines all slices]
		S1[store/hooks.js\nuseAppDispatch and useAppSelector]
		S2[conductorSlice]
		S3[routeSlice]
		S4[ticketSlice]
		S5[busSlice]
		S6[updateSlice]
		S7[alertSlice]
	end

	subgraph Services[Services]
		V1[mockApi.js\nRemote or cached data bridge]
		V2[storage.js\nAsyncStorage wrapper]
		V3[busTelemetry.js\nLive GPS transport]
		V4[mockData.js\nRemote payload loader and verifier]
	end

	subgraph Flow_Constants[Flow Constants]
		F1[flow/navigation.js\nStartup route]
		F2[flow/security.js\nInitializer verification code]
		F3[flow/labels.js\nDisplay labels]
	end

	subgraph Theme_Utils[Theme and Utility Helpers]
		T1[constants/theme.js\nColors, spacing, radii, shadows]
		T2[utils/format.js\nCurrency, time, percentage]
		T3[utils/fare.js\nFare and passenger calculation]
		T4[utils/gps.js\nDistance and proximity]
		T5[utils/mockHelpers.js\nSeeded id generation]
	end

	D1 --> S2
	D1 --> S3
	D1 --> U7

	D2 --> U2
	D2 --> U8
	D2 --> U9
	D2 --> S1
	D2 --> S2
	D2 --> S3
	D2 --> S5
	D2 --> S6
	D2 --> T2

	D3 --> S3
	D3 --> S2
	D3 --> V1
	D3 --> F2
	D3 --> T4
	D3 --> U11

	D4 --> S3
	D4 --> S4
	D4 --> V2
	D4 --> T3
	D4 --> T2
	D4 --> U11

	D5 --> S5
	D5 --> U5
	D5 --> U9
	D5 --> T2

	D6 --> S3
	D6 --> S2
	D6 --> S5
	D6 --> V3
	D6 --> T4
	D6 --> U5

	D7 --> S5
	D7 --> U9

	D8 --> S6
	D8 --> U9

	D9 --> S7
	D9 --> S2
	D9 --> S3
	D9 --> U4
	D9 --> U9

	D10 --> S4
	D10 --> V2
	D10 --> U6
	D10 --> U11

	S0 --> S2
	S0 --> S3
	S0 --> S4
	S0 --> S5
	S0 --> S6
	S0 --> S7
	S1 --> S0

	S2 --> V1
	S2 --> T5
	S3 --> V1
	S3 --> V2
	S3 --> T4
	S4 --> V1
	S4 --> V2
	S4 --> T3
	S4 --> T2
	S5 --> V1
	S5 --> V3
	S5 --> T2
	S6 --> V1
	S7 --> V1
	S7 --> T5

	V1 --> V2
	V1 --> V4
	V3 --> V2
	V3 --> T4
	V3 --> T5
	V4 --> V2

	F1 --> B
	F2 --> D3
	F3 --> C

	T1 --> U1
	T1 --> U2
	T1 --> U3
	T1 --> U4
	T1 --> U5
	T1 --> U6
	T1 --> U7
	T1 --> U8
	T1 --> U9
	T1 --> U10
	T1 --> U11
	T2 --> U6
	T2 --> D2
	T2 --> D4
	T3 --> D4
	T4 --> D3
	T4 --> D6
	T5 --> S7
	T5 --> S4
	T5 --> V1
```

## Reading Guide

- `App.js` owns the bootstrap shell and points into the navigator.
- `RootNavigator.js` consumes the registry and the startup route.
- `appRegistry.js` is the route-to-screen handoff.
- Screens consume shared UI components, store slices, services, and utility helpers.
- Store slices call services and utilities, then expose state to screens.
- The top-level `src` folder outside `ETM-Interface` is not part of this flow.
