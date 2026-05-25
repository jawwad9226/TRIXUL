import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";

const initialState = {
  route: null,
  loading: false,
  error: null,
  currentGps: { latitude: 17.385, longitude: 78.4867 },
  routeEdited: false,
  refreshRequired: false,
};

export const bootstrapRoute = createAsyncThunk(
  "route/bootstrap",
  async (options = {}) => {
    return mockApi.fetchRoute(options);
  },
);

const routeSlice = createSlice({
  name: "route",
  initialState,
  reducers: {
    setRoute(state, action) {
      state.route = action.payload;
    },
    updateRoute(state, action) {
      if (state.route) {
        state.route = { ...state.route, ...action.payload };
        state.routeEdited = true;
      }
    },
    setGps(state, action) {
      state.currentGps = action.payload;
    },
    setRefreshRequired(state, action) {
      state.refreshRequired = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapRoute.pending, (state) => {
        state.loading = true;
      })
      .addCase(bootstrapRoute.fulfilled, (state, action) => {
        state.loading = false;
        state.route = action.payload;
        state.refreshRequired = false;
      })
      .addCase(bootstrapRoute.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to load route";
      });
  },
});

export const { setRoute, updateRoute, setGps, setRefreshRequired } =
  routeSlice.actions;
export default routeSlice.reducer;
