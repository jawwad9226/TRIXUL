import { createSlice } from "@reduxjs/toolkit";

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
