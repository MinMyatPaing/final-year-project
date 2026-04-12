import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import apiClient from '../api/client';
import { loginUser } from '../store/authSlice';
import '../global.css';

export default function EditProfile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token } = useSelector((s) => s.auth);

  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name cannot be empty'); return; }
    if (name.trim() === user?.name) { router.back(); return; }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.patch('/api/auth/profile', { name: name.trim() });
      // Update Redux so the home/profile screens reflect the new name immediately
      dispatch(loginUser({ user: res.data.user, token }));
      Alert.alert('Saved', 'Your name has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Edit Profile</Text>
        </View>

        <View className="px-5">
          {/* Avatar */}
          <View className="items-center mb-8 mt-4">
            <View className="w-20 h-20 bg-indigo-600 rounded-full items-center justify-center mb-2">
              <Text className="text-white text-2xl font-bold">{initials}</Text>
            </View>
            <Text className="text-slate-400 text-sm">{user?.email}</Text>
          </View>

          {/* Name Field */}
          <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
            Display Name
          </Text>
          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-2">
            <Ionicons name="person-outline" size={18} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-slate-800 text-base"
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoFocus
            />
          </View>

          {error ? (
            <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
              <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
              <Text className="text-rose-500 text-sm ml-2">{error}</Text>
            </View>
          ) : <View className="mb-4" />}

          <TouchableOpacity
            className="bg-indigo-600 rounded-xl py-4 items-center"
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text className="text-white text-base font-bold">Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
