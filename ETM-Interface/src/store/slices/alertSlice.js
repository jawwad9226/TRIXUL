import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
import { seededId } from "../../utils/mockHelpers";

const initialState = {
  recentAlerts: [],
  submitting: false,
  error: null,
};

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

const alertSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    hydrateAlerts(state, action) {
      state.recentAlerts = action.payload;
    },
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
export default alertSlice.reducer;
