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
    updateBusAssignment(state, action) {
      if (state.profile) {
        if (action.payload.busNumber) state.profile.busNumber = action.payload.busNumber;
        if (action.payload.busId) state.profile.busId = action.payload.busId;
      }
    },
    setSyncStatus(state, action) {
      if (state.profile) {
        state.profile.syncStatus = action.payload;
      }
    },
  },
});

export const { setProfile, updateBusAssignment, setSyncStatus } = conductorSlice.actions;
export default conductorSlice.reducer;
