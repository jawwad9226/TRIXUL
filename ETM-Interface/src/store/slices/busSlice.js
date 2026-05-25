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

export const refreshBusStatus = createAsyncThunk(
  "bus/refreshStatus",
  async () => fetchLiveBusStatus(),
);
export const refreshActiveBuses = createAsyncThunk(
  "bus/refreshActiveBuses",
  async () => mockApi.fetchActiveBuses(),
);
export const refreshLocationFeed = createAsyncThunk(
  "bus/refreshLocationFeed",
  async () => fetchLatestBusLocation(),
);
export const submitBusLocation = createAsyncThunk(
  "bus/submitBusLocation",
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
      .addCase(refreshBusStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshBusStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(refreshBusStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to load bus status";
      })
      .addCase(refreshActiveBuses.fulfilled, (state, action) => {
        state.activeBuses = action.payload;
      })
      .addCase(refreshLocationFeed.fulfilled, (state, action) => {
        if (!action.payload) {
          return;
        }

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
      .addCase(submitBusLocation.fulfilled, (state, action) => {
        const telemetry = action.payload?.telemetry;
        if (!telemetry) {
          state.locationSyncStatus = action.payload?.queued
            ? "queued"
            : "synced";
          return;
        }

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
      .addCase(submitBusLocation.rejected, (state, action) => {
        state.locationSyncStatus = "queued";
        state.error = action.error.message ?? "Unable to queue bus location";
      })
      .addCase(refreshLocationFeed.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to load live location";
      });
  },
});

export const { setLocationProgress } = busSlice.actions;
export default busSlice.reducer;
