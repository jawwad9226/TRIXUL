<<<<<<< HEAD
// File: src/store/slices/alertSlice.js
// Purpose: Stores emergency alert submissions and recent alerts.
// Imports: mock API and seeded id helper.
// Behavior: Emergency reports are posted here and then surfaced in recent state.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
import { seededId } from "../../utils/mockHelpers";
=======
import { createSlice } from "@reduxjs/toolkit";
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d

const initialState = {
  recentAlerts: [],
  submitting: false,
  error: null,
};

<<<<<<< HEAD
export const submitEmergency = createAsyncThunk(
  "alerts/submitEmergency",
  async (payload) => {
    const alert = {
      ...payload,
      id: seededId("alert"),
      timestamp: new Date().toISOString(),
    };
    await mockApi.submitEmergencyAlert(alert);
    return alert;
  },
);

=======
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
const alertSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    hydrateAlerts(state, action) {
      state.recentAlerts = action.payload;
    },
<<<<<<< HEAD
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitEmergency.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitEmergency.fulfilled, (state, action) => {
        state.submitting = false;
        state.recentAlerts = [action.payload, ...state.recentAlerts];
      })
      .addCase(submitEmergency.rejected, (state, action) => {
        state.submitting = false;
        state.error =
          action.error.message ?? "Unable to submit emergency alert";
      });
  },
});

export const { hydrateAlerts } = alertSlice.actions;
=======
    submitEmergencyLocally(state, action) {
      state.recentAlerts = [action.payload, ...state.recentAlerts];
    }
  }
});

export const { hydrateAlerts, submitEmergencyLocally } = alertSlice.actions;
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
export default alertSlice.reducer;
