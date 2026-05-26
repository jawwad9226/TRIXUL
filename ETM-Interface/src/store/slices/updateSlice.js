<<<<<<< HEAD
import { createSlice } from "@reduxjs/toolkit";
=======
// File: src/store/slices/updateSlice.js
// Purpose: Stores announcements and update completion state.
// Imports: mock API.
// Behavior: The updates screen reads and marks items through this slice.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { mockApi } from "../../services/mockApi";
>>>>>>> 074aea944ef7d952267c5b5ab9738e06f3b9d4e0

const initialState = {
  items: [],
  loading: false,
  error: null,
};

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
  }
});

export const { markUpdateComplete } = updateSlice.actions;
export default updateSlice.reducer;
