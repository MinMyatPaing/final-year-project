/**
 * Registration wizard — 3 steps:
 *   Step 0: Account basics (name · email · password · AI consent)
 *   Step 1: University details (university · year of study)
 *   Step 2: Financial goals (monthly income · monthly spending goal)
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StatusBar, KeyboardAvoidingView, Platform, Switch, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import '../../global.css';

// ─── Constants ─────────────────────────────────────────────────────────────

const YEAR_OPTIONS = [
  '1st Year', '2nd Year', '3rd Year', 'Placement Year',
  'Final Year', 'Masters Yr 1', 'Masters Yr 2', 'PhD', 'Other',
];

const STEP_TITLES = [
  { title: 'Create Account',    sub: 'Step 1 of 3 — Account details' },
  { title: 'Your University',   sub: 'Step 2 of 3 — Academic info' },
  { title: 'Financial Goals',   sub: 'Step 3 of 3 — Optional but helpful' },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function InputField({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, right }) {
  return (
    <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3">
      <Ionicons name={icon} size={18} color="#94a3b8" />
      <TextInput
        className="flex-1 ml-3 text-slate-800 text-base"
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'none'}
      />
      {right}
    </View>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function Register() {
  const router = useRouter();

  // ── Step state ──────────────────────────────────────────────────────────
  const [step, setStep]       = useState(0);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Step 0 — account
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPwd, setConfirmPwd]           = useState('');
  const [showPwd, setShowPwd]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [aiConsent, setAiConsent]             = useState(false);

  // Step 1 — university
  const [university, setUniversity]           = useState('');
  const [yearOfStudy, setYearOfStudy]         = useState('');

  // Step 2 — financial
  const [monthlyIncome, setMonthlyIncome]       = useState('');
  const [spendingGoal, setSpendingGoal]         = useState('');

  // ── Navigation ──────────────────────────────────────────────────────────
  const goBack = () => { setError(''); setStep((s) => s - 1); };

  const validateStep0 = () => {
    if (!name.trim())         return 'Please enter your full name';
    if (!email.trim())        return 'Please enter your email';
    if (password.length < 6)  return 'Password must be at least 6 characters';
    if (password !== confirmPwd) return 'Passwords do not match';
    return null;
  };

  const validateStep1 = () => {
    if (!university.trim()) return 'Please enter your university name';
    if (!yearOfStudy)        return 'Please select your year of study';
    return null;
  };

  const handleContinue = () => {
    setError('');
    const err = step === 0 ? validateStep0() : validateStep1();
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/auth/register', {
        name:                    name.trim(),
        email:                   email.trim().toLowerCase(),
        password,
        university:              university.trim(),
        yearOfStudy,
        monthlyIncome:           parseFloat(monthlyIncome)  || 0,
        monthlySpendingGoal:     parseFloat(spendingGoal)   || 0,
        aiPersonalisationConsent: aiConsent,
      });
      router.replace('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared progress bar ──────────────────────────────────────────────────
  const pct = `${((step + 1) / 3) * 100}%`;

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
          {/* ── Header ─────────────────────────────────────────────── */}
          <View className="px-5 pt-4 pb-2">
            {step > 0 && (
              <TouchableOpacity onPress={goBack} className="mb-3 flex-row items-center">
                <Ionicons name="arrow-back" size={18} color="#6366f1" />
                <Text className="text-indigo-600 text-sm ml-1 font-medium">Back</Text>
              </TouchableOpacity>
            )}

            {/* Progress bar */}
            <View className="h-1.5 bg-slate-100 rounded-full mb-4">
              <View
                className="h-1.5 bg-indigo-500 rounded-full"
                style={{ width: pct }}
              />
            </View>

            <Text className="text-2xl font-bold text-slate-800">{STEP_TITLES[step].title}</Text>
            <Text className="text-slate-400 text-sm mt-1">{STEP_TITLES[step].sub}</Text>
          </View>

          <View className="px-5 pt-3 flex-1">

            {/* ══════════════════════════════════════════════════════
                STEP 0 — Account basics
            ══════════════════════════════════════════════════════ */}
            {step === 0 && (
              <>
                <InputField
                  icon="person-outline" placeholder="Full name"
                  value={name} onChangeText={setName}
                  autoCapitalize="words"
                />
                <InputField
                  icon="mail-outline" placeholder="Email address"
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <InputField
                  icon="lock-closed-outline" placeholder="Password (min 6 chars)"
                  value={password} onChangeText={setPassword}
                  secureTextEntry={!showPwd}
                  right={
                    <TouchableOpacity onPress={() => setShowPwd((v) => !v)}>
                      <Ionicons
                        name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={18} color="#94a3b8"
                      />
                    </TouchableOpacity>
                  }
                />
                <InputField
                  icon="lock-closed-outline" placeholder="Confirm password"
                  value={confirmPwd} onChangeText={setConfirmPwd}
                  secureTextEntry={!showConfirm}
                  right={
                    <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}>
                      <Ionicons
                        name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                        size={18} color="#94a3b8"
                      />
                    </TouchableOpacity>
                  }
                />

                {/* AI consent */}
                <View className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <Text className="text-indigo-800 text-sm font-semibold mb-1">
                        📊 AI Personalisation
                      </Text>
                      <Text className="text-indigo-600 text-xs leading-relaxed">
                        Allow StudyBudget AI to use your academic year, university, and
                        financial goals to give personalised advice. Your data is stored
                        securely and used only within this app. You can change this at
                        any time in your profile settings.
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

                {/* Privacy disclaimer */}
                <Text className="text-slate-400 text-xs text-center mb-5 leading-relaxed">
                  By creating an account you agree to our{' '}
                  <Text className="text-indigo-500">Terms of Service</Text> and{' '}
                  <Text className="text-indigo-500">Privacy Policy</Text>.
                </Text>
              </>
            )}

            {/* ══════════════════════════════════════════════════════
                STEP 1 — University details
            ══════════════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
                  University Name
                </Text>
                <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5">
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

                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-3">
                  Year of Study
                </Text>
                <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
                  {YEAR_OPTIONS.map((yr) => (
                    <TouchableOpacity
                      key={yr}
                      onPress={() => setYearOfStudy(yr)}
                      className={`px-4 py-2.5 rounded-xl border ${
                        yearOfStudy === yr
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          yearOfStudy === yr ? 'text-white' : 'text-slate-500'
                        }`}
                      >
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5">
                  <Text className="text-slate-500 text-xs text-center">
                    This helps the AI tailor advice to your stage of study —
                    e.g. final-year budget tips vs. placement year expenses.
                  </Text>
                </View>
              </>
            )}

            {/* ══════════════════════════════════════════════════════
                STEP 2 — Financial goals (optional)
            ══════════════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-5">
                  <Text className="text-emerald-700 text-xs text-center">
                    ✅  Both fields are optional — you can always add them later in your
                    profile settings.
                  </Text>
                </View>

                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
                  Monthly Income (£)
                </Text>
                <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-2">
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
                <Text className="text-slate-400 text-xs mb-5">
                  Include student loan, wages, bursaries — anything you receive monthly.
                </Text>

                <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
                  Monthly Spending Goal (£)
                </Text>
                <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-2">
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
                  This sets the overall budget target on your Budget screen and triggers
                  spending notifications.
                </Text>
              </>
            )}

            {/* ── Error banner ──────────────────────────────────────── */}
            {error ? (
              <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
                <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
                <Text className="text-rose-500 text-sm ml-2 flex-1">{error}</Text>
              </View>
            ) : null}

            {/* ── Primary button ────────────────────────────────────── */}
            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-4 items-center mb-4"
              onPress={step < 2 ? handleContinue : handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-base font-bold">
                  {step < 2 ? 'Continue →' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* ── Already have account ──────────────────────────────── */}
            {step === 0 && (
              <TouchableOpacity
                className="items-center py-2 mb-6"
                onPress={() => router.replace('/login')}
              >
                <Text className="text-slate-500 text-sm">
                  Already have an account?{' '}
                  <Text className="text-indigo-600 font-semibold">Sign in</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* ── Skip step 2 ───────────────────────────────────────── */}
            {step === 2 && (
              <TouchableOpacity
                className="items-center py-2 mb-6"
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text className="text-slate-400 text-sm">Skip for now</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
