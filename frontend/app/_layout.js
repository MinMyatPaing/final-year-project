import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Provider } from 'react-redux';
import store from '../store';
import { initializeAuth } from '../store/authSlice';
import { setAuthDispatch } from '../api/client';

/**
 * AuthGuard — pure routing side-effect component.
 * Only handles the redirect logic AFTER initialization is done.
 * NOTE: This is rendered AFTER the loading screen, so useSegments is safe here.
 */
function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const isLoggedIn = useSelector((state) => !!state.auth?.token);
  const initialized = useSelector((state) => !!state.auth?.initialized);

  useEffect(() => {
    if (!initialized) return;

    const inProtectedArea = segments[0] === '(tabs)';
    const atRoot = segments.length === 0;
    // Only redirect logged-in users away from the explicit auth screens
    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register';

    if (!isLoggedIn && (inProtectedArea || atRoot)) {
      router.replace('/login');
    } else if (isLoggedIn && inAuthScreen) {
      // Logged-in user tried to open login/register — send them home
      router.replace('/(tabs)/home');
    }
    // All other routes (/help, /about, /all-transactions, etc.) are fine as-is
  }, [initialized, isLoggedIn, segments]);

  return null;
}

function RootLayoutNav() {
  const dispatch = useDispatch();
  const initialized = useSelector((state) => !!state.auth?.initialized);

  /**
   * FIX: initializeAuth is dispatched HERE in RootLayoutNav,
   * not inside AuthGuard. This ensures it runs even while the
   * loading spinner is showing, breaking the previous deadlock.
   */
  useEffect(() => {
    setAuthDispatch(dispatch);      // wire axios auto-logout interceptor
    dispatch(initializeAuth());     // restore session from SecureStore
  }, []);

  // Show indigo splash while checking SecureStore / hitting /me
  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#4f46e5',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="all-transactions" />
        <Stack.Screen name="help" />
        <Stack.Screen name="about" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="add-expense" />
        <Stack.Screen name="budget" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
