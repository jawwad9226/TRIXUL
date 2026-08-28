import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  route: null,
  loading: false,
  error: null,
  refreshRequired: false,
};

const routeSlice = createSlice({
  name: "route",
  initialState,
  reducers: {
    setRoute(state, action) {
      state.route = action.payload;
    },
    updateRoute(state, action) {
      if (state.route) {
        state.route = { ...state.route, ...action.payload };
      }
    },
    setRefreshRequired(state, action) {
      state.refreshRequired = action.payload;
    },
  },
});

export const { setRoute, updateRoute, setRefreshRequired } = routeSlice.actions;
export default routeSlice.reducer;
