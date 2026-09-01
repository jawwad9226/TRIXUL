<<<<<<< HEAD
// File: src/store/slices/conductorSlice.js
// Purpose: Stores conductor profile and sync state.
// Imports: mock API for bootstrap loading.
// Behavior: Screens and services read conductor identity from this slice.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";

const initialState = {
  profile: null,
=======
import { createSlice } from "@reduxjs/toolkit";


const initialState = {
  profile: null, // { emp_id, name, role }
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
  loading: false,
  error: null,
};

<<<<<<< HEAD
export const bootstrapConductor = createAsyncThunk(
  "conductor/bootstrap",
  async (options = {}) => {
    return mockApi.fetchConductorProfile(options);
  },
);

=======
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
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
<<<<<<< HEAD
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
=======
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
});

export const { setProfile, setSyncStatus } = conductorSlice.actions;
export default conductorSlice.reducer;
