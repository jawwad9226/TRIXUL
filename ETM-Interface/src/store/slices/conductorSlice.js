// File: src/store/slices/conductorSlice.js
// Purpose: Stores conductor profile and sync state.
// Imports: mock API for bootstrap loading.
// Behavior: Screens and services read conductor identity from this slice.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";

const initialState = {
  profile: null,
  loading: false,
  error: null,
};

export const bootstrapConductor = createAsyncThunk(
  "conductor/bootstrap",
  async (options = {}) => {
    return mockApi.fetchConductorProfile(options);
  },
);

const conductorSlice = createSlice({
  name: "conductor",
  initialState,
  reducers: {
    setProfile(state, action) {
      state.profile = action.payload;
    },
    setSyncStatus(state, action) {
      if (state.profile) {
        state.profile.syncStatus = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapConductor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bootstrapConductor.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(bootstrapConductor.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message ?? "Unable to load conductor profile";
      });
  },
});

export const { setProfile, setSyncStatus } = conductorSlice.actions;
export default conductorSlice.reducer;
