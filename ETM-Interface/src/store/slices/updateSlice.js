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
    setUpdates(state, action) {
      state.items = action.payload;
    },
    markUpdateComplete(state, action) {
      const item = state.items.find((update) => update.id === action.payload);
      if (item) {
        item.completed = true;
        item.unread = false;
      }
    },
  }
});

export const { setUpdates, markUpdateComplete } = updateSlice.actions;
export default updateSlice.reducer;
