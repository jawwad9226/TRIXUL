// File: src/store/slices/updateSlice.js
// Purpose: Stores announcements and update completion state.
// Imports: mock API.
// Behavior: The updates screen reads and marks items through this slice.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";

const initialState = {
  items: [],
  loading: false,
  error: null,
};

export const refreshUpdates = createAsyncThunk("updates/refresh", async () =>
  mockApi.fetchUpdates(),
);

const updateSlice = createSlice({
  name: "updates",
  initialState,
  reducers: {
    markUpdateComplete(state, action) {
      const item = state.items.find((update) => update.id === action.payload);
      if (item) {
        item.completed = true;
        item.unread = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshUpdates.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshUpdates.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(refreshUpdates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Unable to load updates";
      });
  },
});

export const { markUpdateComplete } = updateSlice.actions;
export default updateSlice.reducer;
