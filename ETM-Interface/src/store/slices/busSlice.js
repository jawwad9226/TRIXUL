<<<<<<< HEAD
import { createSlice } from "@reduxjs/toolkit";
=======
// File: src/store/slices/busSlice.js
// Purpose: Tracks live bus status, active buses, and location feed state.
// Imports: mock API and bus telemetry services.
// Behavior: Dashboard and location screens read from this slice after refresh actions.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
import {
  fetchLatestBusLocation,
  fetchLiveBusStatus,
  reportBusLocation,
} from "../../services/busTelemetry";
>>>>>>> 074aea944ef7d952267c5b5ab9738e06f3b9d4e0

const initialState = {
  status: null, // { current_stop, next_stop, eta_minutes, condition, speed }
  activeBuses: [],
  loading: false,
  error: null,
};

const busSlice = createSlice({
  name: "bus",
  initialState,
  reducers: {
    setBusStatus(state, action) {
      state.status = action.payload;
    },
    setBusLoading(state, action) {
      state.loading = action.payload;
    },
    setBusError(state, action) {
      state.error = action.payload;
    }
  },
});

export const { setBusStatus, setBusLoading, setBusError } = busSlice.actions;
export default busSlice.reducer;
