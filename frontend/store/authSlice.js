import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'pocketwise_token';

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

// ─── In-memory token helpers (imported lazily to avoid circular deps) ─────────
function syncSetBearerToken(token) {
  // Lazy import avoids circular dependency between authSlice ↔ client
  import('../api/client').then(({ setBearerToken }) => setBearerToken(token));
}

function syncClearBearerToken() {
  import('../api/client').then(({ clearBearerToken }) => clearBearerToken());
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
  signedOut: false, // true after an explicit user-triggered logout
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.initialized = true;
      state.signedOut = false;
      // Sync the in-memory cache FIRST so the very next API call works,
      // then persist to SecureStore asynchronously.
      syncSetBearerToken(action.payload.token);
      saveToken(action.payload.token); // fire-and-forget
    },
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.initialized = true;
      state.signedOut = true; // triggers "signed out" banner on login screen
      syncClearBearerToken();
      deleteToken(); // fire-and-forget
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.initialized = true;
        state.signedOut = false;
        // Token was read from SecureStore; prime in-memory cache for
        // subsequent requests made before the next SecureStore read.
        syncSetBearerToken(action.payload.token);
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.initialized = true;
        syncClearBearerToken();
        // Don't set signedOut=true here — this is an expired/missing token,
        // not an explicit user action.
      });
  },
});

export const { loginUser, logoutUser } = authSlice.actions;
export default authSlice.reducer;
