import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'studybudget_token';

// ─── Secure storage helpers ───────────────────────────────────────────────────
export async function saveToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Thunk: restore session on app launch ────────────────────────────────────
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getToken();
      if (!token) return rejectWithValue('no_token');

      // Verify the token is still valid against the backend
      const apiClient = (await import('../api/client')).default;
      const res = await apiClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      return { token, user: res.data.user };
    } catch (err) {
      await deleteToken();
      return rejectWithValue('invalid_or_expired_token');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.initialized = true;
      saveToken(action.payload.token); // fire-and-forget
    },
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.transactions = [];
      state.initialized = true;
      deleteToken(); // fire-and-forget
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.initialized = true;
      })
  },
});

export const { loginUser, logoutUser } = authSlice.actions;
export default authSlice.reducer;
