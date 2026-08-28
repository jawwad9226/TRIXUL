import { createSlice } from "@reduxjs/toolkit";
import {
  fetchLatestBusLocation,
  fetchLiveBusStatus,
  reportBusLocation,
} from "../../services/busTelemetry";

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
