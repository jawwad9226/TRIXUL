import { createSlice } from "@reduxjs/toolkit";


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
