<<<<<<< HEAD
import { createSlice } from "@reduxjs/toolkit";
=======
// File: src/store/slices/alertSlice.js
// Purpose: Stores emergency alert submissions and recent alerts.
// Imports: mock API and seeded id helper.
// Behavior: Emergency reports are posted here and then surfaced in recent state.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
import { seededId } from "../../utils/mockHelpers";
>>>>>>> 074aea944ef7d952267c5b5ab9738e06f3b9d4e0

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
