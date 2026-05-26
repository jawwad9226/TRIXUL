<<<<<<< HEAD
import { createSlice } from "@reduxjs/toolkit";
=======
// File: src/store/slices/routeSlice.js
// Purpose: Owns route data, GPS state, and route-edit flags.
// Imports: mock API for bootstrap loading.
// Behavior: Screens read route state from here and dispatch edits back here.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
>>>>>>> 074aea944ef7d952267c5b5ab9738e06f3b9d4e0

const initialState = {
  route: null,
  loading: false,
  error: null,
  refreshRequired: false,
};

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
      }
    },
    setRefreshRequired(state, action) {
      state.refreshRequired = action.payload;
    },
  },
});

export const { setRoute, updateRoute, setRefreshRequired } = routeSlice.actions;
export default routeSlice.reducer;
