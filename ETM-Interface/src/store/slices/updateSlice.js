<<<<<<< HEAD
// File: src/store/slices/updateSlice.js
// Purpose: Stores announcements and update completion state.
// Imports: mock API.
// Behavior: The updates screen reads and marks items through this slice.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
=======
import { createSlice } from "@reduxjs/toolkit";
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d

const initialState = {
  items: [],
  loading: false,
  error: null,
};

<<<<<<< HEAD
export const refreshUpdates = createAsyncThunk("updates/refresh", async () =>
  mockApi.fetchUpdates(),
);

=======
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
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
<<<<<<< HEAD
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
=======
  }
>>>>>>> da96a6a0d115137ee22cf4d68500d252ffd4c98d
});

export const { markUpdateComplete } = updateSlice.actions;
export default updateSlice.reducer;
