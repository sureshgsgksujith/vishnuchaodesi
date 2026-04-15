import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthState } from "./types";

const initialState: AuthState = {
  token: null,
  userName: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; userName: string }>
    ) => {
      state.token = action.payload.token;
      state.userName = action.payload.userName;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.token = null;
      state.userName = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;