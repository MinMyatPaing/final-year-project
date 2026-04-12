import { useState } from 'react';
import { View, Text, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../../store/authSlice';
import apiClient from '../../api/client';
import '../../global.css';

import HeroSection from '../../components/login/HeroSection';
import LoginForm from '../../components/login/LoginForm';

export default function Login() {
  const signedOut = useSelector((state) => !!state.auth?.signedOut);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      dispatch(loginUser({ token: res.data.token, user: res.data.user }));
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Signed-out banner — only shown after an explicit logout */}
          {signedOut && (
            <View className="mx-5 mt-4 flex-row items-center bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <Ionicons name="checkmark-circle-outline" size={18} color="#10b981" />
              <Text className="text-emerald-700 text-sm font-medium ml-2">
                You have been signed out successfully.
              </Text>
            </View>
          )}

          <HeroSection />

          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            error={error}
            loading={loading}
            onSubmit={handleLogin}
          />

          {/* Footer */}
          <View className="items-center py-6">
            <Text className="text-slate-400 text-xs">Your finances, managed smarter 🎓</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
