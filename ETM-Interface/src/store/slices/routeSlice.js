<<<<<<< HEAD
// File: src/store/slices/routeSlice.js
// Purpose: Owns route data, GPS state, and route-edit flags.
// Imports: mock API for bootstrap loading.
// Behavior: Screens read route state from here and dispatch edits back here.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
=======
import { createSlice } from "@reduxjs/toolkit";
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d

const initialState = {
  route: null,
  loading: false,
  error: null,
<<<<<<< HEAD
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

=======
  refreshRequired: false,
};

>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
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
<<<<<<< HEAD
        state.routeEdited = true;
      }
    },
    setGps(state, action) {
      state.currentGps = action.payload;
    },
=======
      }
    },
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
    setRefreshRequired(state, action) {
      state.refreshRequired = action.payload;
    },
  },
<<<<<<< HEAD
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
=======
});

export const { setRoute, updateRoute, setRefreshRequired } = routeSlice.actions;
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
export default routeSlice.reducer;
