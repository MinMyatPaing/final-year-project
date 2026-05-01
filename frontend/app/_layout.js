/**
 * Root layout — auth guard + navigation tree.
 *
 * React 19 / Expo Router 6 / New Architecture note:
 * ──────────────────────────────────────────────────
 * React 19 batches state transitions across ALL components that subscribe to
 * the same scheduler in the same concurrent render pass.  If a separate
 * <AuthGuard> component used useRouter() (which subscribes to the navigation
 * context), React would re-render it in the same batch as any screen that
 * called setState.  During that batched reconciliation the navigation context
 * can be mid-transition, causing "Couldn't find a navigation context" to be
 * thrown and attributed to the screen that triggered the batch (e.g.
 * add-expense.js pressing the Income tab).
 *
 * Fix: keep ALL auth redirect logic inside RootLayoutNav.  Use the static
 * `router` SINGLETON (no context subscription) for the actual navigation
 * calls.  useSegments() is fine — it reads from Expo Router's own store, not
 * React Navigation's useNavigation() context.
 *
 * Blank-screen-on-reload fix:
 * When `initialized` flips to true the Stack mounts but the current URL is
 * still "/" (segments = []).  The useEffect redirect fires one frame later,
 * leaving a white flash.  We detect this "pending redirect" state and keep the
 * loading spinner visible until segments actually reflect the destination.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, Stack, useSegments } from 'expo-router';   // static router — NO subscription
import { useSelector, useDispatch } from 'react-redux';
import { Provider } from 'react-redux';
import store from '../store';
import { initializeAuth } from '../store/authSlice';
import { setAuthDispatch } from '../api/client';

// ─── Loading screen (shown while session is being restored OR during redirect) ─

function LoadingScreen() {
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

// ─── Root navigation layout ───────────────────────────────────────────────────

function RootLayoutNav() {
  const dispatch    = useDispatch();
  const initialized = useSelector((state) => !!state.auth?.initialized);
  const isLoggedIn  = useSelector((state) => !!state.auth?.token);
  const segments    = useSegments();     // Expo Router store — safe, no nav-context subscription

  // 1. Restore session from SecureStore on first mount
  useEffect(() => {
    setAuthDispatch(dispatch);
    dispatch(initializeAuth());
  }, []);

  // 2. Auth redirect (runs after every segments/auth change)
  //    Uses the static router SINGLETON — no navigation-context subscription.
  useEffect(() => {
    if (!initialized) return;

    const atRoot         = segments.length === 0;
    const inAuthScreen   = segments[0] === 'login' || segments[0] === 'register';
    const inProtected    = segments[0] === '(tabs)';

    if (!isLoggedIn && (inProtected || atRoot)) {
      router.replace('/login');
    } else if (isLoggedIn && (inAuthScreen || atRoot)) {
      router.replace('/(tabs)/home');
    }
  }, [initialized, isLoggedIn, segments]);

  // 3. While session check is running → loading spinner
  if (!initialized) return <LoadingScreen />;

  // 4. ALWAYS render the Stack once initialized so pending router.replace()
  //    calls (e.g. from the login page or from the useEffect above) have a
  //    live navigator to dispatch into.
  //
  //    The root "/" blank-screen is covered by app/index.js which renders an
  //    indigo spinner — no need to unmount the Stack here.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/*
        In Expo Router v6, directory-based routes are registered under the
        full segment path:  app/login/index.js  →  "login/index"
        The URL path (/login) is unchanged.
      */}
      <Stack.Screen name="index" />          {/* app/index.js — indigo spinner at "/" */}
      <Stack.Screen name="login/index" />
      <Stack.Screen name="register/index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="all-transactions" />
      <Stack.Screen name="help" />
      <Stack.Screen name="about" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="add-expense" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="delete-account" />
    </Stack>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
