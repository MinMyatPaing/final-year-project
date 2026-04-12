/**
 * Edit Profile — allows editing name, university, year of study,
 * monthly income, spending goal, and AI personalisation consent.
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import apiClient from '../api/client';
import { loginUser } from '../store/authSlice';
import '../global.css';

const YEAR_OPTIONS = [
  '1st Year', '2nd Year', '3rd Year', 'Placement Year',
  'Final Year', 'Masters Yr 1', 'Masters Yr 2', 'PhD', 'Other',
];

export default function EditProfile() {
  const router    = useRouter();
  const dispatch  = useDispatch();
  const { user, token } = useSelector((s) => s.auth);

  const [name,         setName]         = useState(user?.name               || '');
  const [university,   setUniversity]   = useState(user?.university          || '');
  const [yearOfStudy,  setYearOfStudy]  = useState(user?.yearOfStudy         || '');
  const [monthlyIncome, setMonthlyIncome] = useState(
    user?.monthlyIncome ? String(user.monthlyIncome) : ''
  );
  const [spendingGoal,  setSpendingGoal]  = useState(
    user?.monthlySpendingGoal ? String(user.monthlySpendingGoal) : ''
  );
  const [aiConsent,    setAiConsent]    = useState(user?.aiPersonalisationConsent ?? false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';
  const initials    = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name cannot be empty'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.patch('/api/auth/profile', {
        name:                    name.trim(),
        university:              university.trim(),
        yearOfStudy,
        monthlyIncome:           parseFloat(monthlyIncome)  || 0,
        monthlySpendingGoal:     parseFloat(spendingGoal)   || 0,
        aiPersonalisationConsent: aiConsent,
      });
      dispatch(loginUser({ user: res.data.user, token }));
      Alert.alert('Saved ✓', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Edit Profile</Text>
        </View>

        <ScrollView
          className="px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View className="items-center mb-6 mt-2">
            <View className="w-20 h-20 bg-indigo-600 rounded-full items-center justify-center mb-2">
              <Text className="text-white text-2xl font-bold">{initials}</Text>
            </View>
            <Text className="text-slate-400 text-sm">{user?.email}</Text>
          </View>

          {/* ── Section: Account ─────────────────────────────────── */}
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Account
          </Text>

          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3">
            <Ionicons name="person-outline" size={18} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-slate-800 text-base"
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* ── Section: University ───────────────────────────────── */}
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3 mt-4">
            University
          </Text>

          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4">
            <Ionicons name="school-outline" size={18} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-slate-800 text-base"
              placeholder="e.g. University of Huddersfield"
              placeholderTextColor="#94a3b8"
              value={university}
              onChangeText={setUniversity}
              autoCapitalize="words"
            />
          </View>

          <Text className="text-slate-500 text-xs font-medium mb-2">Year of Study</Text>
          <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
            {YEAR_OPTIONS.map((yr) => (
              <TouchableOpacity
                key={yr}
                onPress={() => setYearOfStudy(yr)}
                className={`px-3 py-2 rounded-xl border ${
                  yearOfStudy === yr
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    yearOfStudy === yr ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {yr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Section: Financial Goals ──────────────────────────── */}
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3 mt-2">
            Financial Goals
          </Text>

          <Text className="text-slate-500 text-xs mb-1">Monthly Income (£)</Text>
          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-1">
            <Text className="text-slate-400 text-base mr-1">£</Text>
            <TextInput
              className="flex-1 text-slate-800 text-base"
              placeholder="e.g. 900"
              placeholderTextColor="#94a3b8"
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
              keyboardType="decimal-pad"
            />
          </View>
          <Text className="text-slate-400 text-xs mb-4">
            Student loan + wages + any regular income.
          </Text>

          <Text className="text-slate-500 text-xs mb-1">Monthly Spending Goal (£)</Text>
          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-1">
            <Text className="text-slate-400 text-base mr-1">£</Text>
            <TextInput
              className="flex-1 text-slate-800 text-base"
              placeholder="e.g. 600"
              placeholderTextColor="#94a3b8"
              value={spendingGoal}
              onChangeText={setSpendingGoal}
              keyboardType="decimal-pad"
            />
          </View>
          <Text className="text-slate-400 text-xs mb-5">
            Powers the Budget screen and spending notifications.
          </Text>

          {/* ── Section: AI Personalisation ──────────────────────── */}
          <View className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-indigo-800 text-sm font-semibold mb-1">
                  📊 AI Personalisation
                </Text>
                <Text className="text-indigo-600 text-xs leading-relaxed">
                  When enabled, StudyBudget AI uses your academic year, university, and
                  financial goals to give you more relevant advice. Your profile is stored
                  securely and is never shared externally.
                </Text>
              </View>
              <Switch
                value={aiConsent}
                onValueChange={setAiConsent}
                trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                thumbColor={aiConsent ? '#6366f1' : '#f1f5f9'}
              />
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
              <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
              <Text className="text-rose-500 text-sm ml-2 flex-1">{error}</Text>
            </View>
          ) : null}

          {/* Save button */}
          <TouchableOpacity
            className="bg-indigo-600 rounded-xl py-4 items-center mb-10"
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base font-bold">Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
