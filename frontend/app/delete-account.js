import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../store/authSlice';
import apiClient from '../api/client';
import '../global.css';

export default function DeleteAccount() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Snapshot the user details at mount time so they don't disappear
  // if the Redux state is partially cleared during deletion.
  const userSnapshot = useRef({
    name: user?.name || 'User',
    email: user?.email || '',
    initial: (user?.name || user?.email || 'U')[0].toUpperCase(),
  });

  const handleDelete = () => {
    if (!emailInput.trim()) {
      setError('Please enter your email address to confirm.');
      return;
    }
    if (emailInput.trim().toLowerCase() !== userSnapshot.current.email.toLowerCase()) {
      setError('The email you entered does not match your account email.');
      return;
    }

    Alert.alert(
      '⚠️ Permanently Delete Account',
      'This will immediately and permanently delete:\n\n• Your account\n• All your transactions\n• All your AI data\n\nThis action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.delete('/api/auth/account', {
        data: { email: emailInput.trim() },
        timeout: 60_000, // override the default 30s — deletion can take a moment
      });
      // Dispatch logout AFTER the API call succeeds so the user snapshot
      // stays intact throughout the loading phase.
      dispatch(logoutUser());
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete account.';
      setError(msg);
      setLoading(false);
    }
    // Note: we intentionally do NOT setLoading(false) on success —
    // the screen will unmount as the router redirects to login.
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Full-screen loading overlay — blocks all interaction during deletion */}
      <Modal visible={loading} transparent animationType="fade" statusBarTranslucent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 32,
              alignItems: 'center',
              marginHorizontal: 40,
            }}
          >
            <ActivityIndicator size="large" color="#f43f5e" />
            <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 16, marginTop: 16 }}>
              Deleting account…
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              Please wait. Do not close the app.{'\n'}This may take up to 30 seconds.
            </Text>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1" disabled={loading}>
            <Ionicons name="arrow-back" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Delete Account</Text>
        </View>

        {/* KeyboardAvoidingView wraps the scrollable content */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            className="px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Warning card */}
            <View className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-5">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-rose-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="warning" size={22} color="#f43f5e" />
                </View>
                <Text className="text-rose-700 font-bold text-base flex-1">
                  This cannot be undone
                </Text>
              </View>
              <Text className="text-rose-600 text-sm leading-5">
                Deleting your account will permanently remove all of your data from our
                systems, including:
              </Text>
              <View className="mt-3">
                {[
                  'Your account and login credentials',
                  'All transaction history',
                  'All AI-generated insights and chat history',
                  'Your profile and preferences',
                  'All data stored in our vector database',
                ].map((item, i) => (
                  <View key={i} className="flex-row items-start mb-1.5">
                    <Ionicons name="close-circle" size={14} color="#f43f5e" style={{ marginTop: 2, marginRight: 6 }} />
                    <Text className="text-rose-600 text-sm flex-1">{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Account info — uses snapshot so it never goes blank */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-5">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
                Account to be deleted
              </Text>
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-indigo-600 font-bold text-sm">
                    {userSnapshot.current.initial}
                  </Text>
                </View>
                <View>
                  <Text className="text-slate-800 font-semibold text-sm">
                    {userSnapshot.current.name}
                  </Text>
                  <Text className="text-slate-400 text-xs">
                    {userSnapshot.current.email}
                  </Text>
                </View>
              </View>
            </View>

            {/* Confirmation input */}
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-5">
              <Text className="text-slate-800 font-bold text-sm mb-1">
                Confirm your email address
              </Text>
              <Text className="text-slate-400 text-xs mb-3">
                Type your email address below to confirm you want to permanently delete your account.
              </Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm"
                placeholder={userSnapshot.current.email || 'your@email.com'}
                placeholderTextColor="#94a3b8"
                value={emailInput}
                onChangeText={(v) => { setEmailInput(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="done"
              />
              {error ? (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="alert-circle-outline" size={14} color="#f43f5e" />
                  <Text className="text-rose-500 text-xs ml-1 flex-1">{error}</Text>
                </View>
              ) : null}
            </View>

            {/* Delete button */}
            <TouchableOpacity
              onPress={handleDelete}
              disabled={loading}
              className="bg-rose-500 rounded-2xl py-4 items-center flex-row justify-center mb-4"
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="white" />
              <Text className="text-white font-bold text-base ml-2">
                Permanently Delete My Account
              </Text>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={() => router.back()}
              disabled={loading}
              className="items-center py-3"
            >
              <Text className="text-slate-400 text-sm">Cancel — keep my account</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
