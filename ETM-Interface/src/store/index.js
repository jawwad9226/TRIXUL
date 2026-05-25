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
