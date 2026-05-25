import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
import {
  fetchLatestBusLocation,
  fetchLiveBusStatus,
  reportBusLocation,
} from "../../services/busTelemetry";

const initialState = {
  status: null,
  locationProgress: 0,
  locationLabel: "Awaiting live GPS",
  locationSpeed: 0,
  locationSyncStatus: "idle",
  locationTimestamp: null,
  activeBuses: [],
  loading: false,
  error: null,
};

// Refresh the live status card from the backend telemetry summary.
export const refreshBusStatus = createAsyncThunk(
  "bus/refreshStatus",
  async () => fetchLiveBusStatus(),
);
// Reload the active fleet list for the dashboard and route views.
export const refreshActiveBuses = createAsyncThunk(
  "bus/refreshActiveBuses",
  async () => mockApi.fetchActiveBuses(),
);
// Pull the latest location snapshot so the interface reflects the current bus point.
export const refreshLocationFeed = createAsyncThunk(
  "bus/refreshLocationFeed",
  async () => fetchLatestBusLocation(),
);
// Send the bus GPS report to the backend or queue it locally if offline.
export const submitBusLocation = createAsyncThunk(
  "bus/submitBusLocation",
  // Post the live GPS reading and let the service queue failures locally.
  async (payload = {}) => reportBusLocation(payload),
);

const busSlice = createSlice({
  name: "bus",
  initialState,
  reducers: {
    setLocationProgress(state, action) {
      state.locationProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Track when the live status fetch is in progress.
      .addCase(refreshBusStatus.pending, (state) => {
        state.loading = true;
      })
      // Store the latest bus status summary returned by the backend.
      .addCase(refreshBusStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      // Preserve the error so the UI can surface failed telemetry reads.
      .addCase(refreshBusStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to load bus status";
      })
      // Keep the active-bus list in sync with the shared backend fleet view.
      .addCase(refreshActiveBuses.fulfilled, (state, action) => {
        state.activeBuses = action.payload;
      })
      // Mirror the latest backend location snapshot in the UI state.
      .addCase(refreshLocationFeed.fulfilled, (state, action) => {
        if (!action.payload) {
          return;
        }

        // Update the visible location summary from the latest backend telemetry.
        state.locationProgress =
          action.payload.progress ?? state.locationProgress;
        state.locationSpeed = action.payload.speed ?? 0;
        state.locationSyncStatus = "synced";
        state.locationTimestamp =
          action.payload.receivedAt ?? action.payload.timestamp ?? null;
        state.locationLabel =
          action.payload.latitude != null && action.payload.longitude != null
            ? `GPS ${Number(action.payload.latitude).toFixed(4)}, ${Number(action.payload.longitude).toFixed(4)}`
            : state.locationLabel;
      })
      // Update the visible GPS state after a report has been accepted or queued.
      .addCase(submitBusLocation.fulfilled, (state, action) => {
        const telemetry = action.payload?.telemetry;
        if (!telemetry) {
          state.locationSyncStatus = action.payload?.queued
            ? "queued"
            : "synced";
          return;
        }

        // Keep the UI aligned with the data that was actually accepted or queued.
        state.locationProgress = telemetry.progress ?? state.locationProgress;
        state.locationSpeed = telemetry.speed ?? 0;
        state.locationSyncStatus = action.payload?.queued ? "queued" : "synced";
        state.locationTimestamp =
          telemetry.receivedAt ?? telemetry.timestamp ?? null;
        state.locationLabel =
          telemetry.latitude != null && telemetry.longitude != null
            ? `GPS ${Number(telemetry.latitude).toFixed(4)}, ${Number(telemetry.longitude).toFixed(4)}`
            : state.locationLabel;
      })
      // Show a queueing state if the live report could not be delivered immediately.
      .addCase(submitBusLocation.rejected, (state, action) => {
        state.locationSyncStatus = "queued";
        state.error = action.error.message ?? "Unable to queue bus location";
      })
      // Surface a read error if the latest location feed cannot be loaded.
      .addCase(refreshLocationFeed.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to load live location";
      });
  },
});

export const { setLocationProgress } = busSlice.actions;
export default busSlice.reducer;
