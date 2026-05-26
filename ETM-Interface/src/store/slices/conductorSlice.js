<<<<<<< HEAD
import { createSlice } from "@reduxjs/toolkit";
=======
// File: src/store/slices/conductorSlice.js
// Purpose: Stores conductor profile and sync state.
// Imports: mock API for bootstrap loading.
// Behavior: Screens and services read conductor identity from this slice.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
>>>>>>> 074aea944ef7d952267c5b5ab9738e06f3b9d4e0

const initialState = {
  profile: null, // { emp_id, name, role }
  loading: false,
  error: null,
};

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
});

export const { setProfile, setSyncStatus } = conductorSlice.actions;
export default conductorSlice.reducer;
