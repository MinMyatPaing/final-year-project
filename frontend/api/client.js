import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Node.js backend — port 3000 (auth, chat proxy, etc.)
// iOS Simulator / Android Emulator → http://127.0.0.1:3000  ✓ (current)
// Physical device (Expo Go on phone) → http://10.130.171.15:3000  (your Mac's LAN IP)
// export const BASE_URL = 'http://127.0.0.1:3000';

// ↑ Update .env.local → EXPO_PUBLIC_API_URL when your WiFi/IP changes
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.130.171.15:3000';

const TOKEN_KEY = 'studybudget_token';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // timeout the request after 30s
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ─────────────────────────────────────────────────────
// Attach the stored Bearer token to every outgoing request automatically
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────
// On 401 with a specific auth-error code → wipe token + trigger Redux logout.
let _dispatch = null;

export function setAuthDispatch(dispatch) {
  _dispatch = dispatch;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    const isAuthError =
      status === 401 &&
      (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'NO_TOKEN');

    if (isAuthError && _dispatch) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      const { logoutUser } = await import('../store/authSlice');
      _dispatch(logoutUser());
    }

    return Promise.reject(error);
  }
);

export default apiClient;
