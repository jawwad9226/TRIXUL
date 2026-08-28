import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  recentAlerts: [],
  submitting: false,
  error: null,
};

const alertSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    hydrateAlerts(state, action) {
      state.recentAlerts = action.payload;
    },
    submitEmergencyLocally(state, action) {
      state.recentAlerts = [action.payload, ...state.recentAlerts];
    }
  }
});

export const { hydrateAlerts, submitEmergencyLocally } = alertSlice.actions;
export default alertSlice.reducer;
