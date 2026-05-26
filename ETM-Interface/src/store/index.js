// File: src/store/index.js
// Purpose: Combines all Redux slices into the app store.
// Imports: conductor, route, ticket, bus, updates, and alerts reducers.
// Behavior: Any screen using the store reads from this root reducer.
import { configureStore } from "@reduxjs/toolkit";

import conductorReducer from "./slices/conductorSlice";
import routeReducer from "./slices/routeSlice";
import ticketReducer from "./slices/ticketSlice";
import busReducer from "./slices/busSlice";
import updateReducer from "./slices/updateSlice";
import alertReducer from "./slices/alertSlice";

export const store = configureStore({
  reducer: {
    conductor: conductorReducer,
    route: routeReducer,
    ticket: ticketReducer,
    bus: busReducer,
    updates: updateReducer,
    alerts: alertReducer,
  },
});
