import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import apiClient from '../api/client';
import { fetchTransactions } from '../store/transactionSlice';
import '../global.css';

// NativeWind 4.x / new-arch: shadow-* utility classes go through the CSS
// interop which internally calls useNavigationContainerContext() — this
// throws "Couldn't find a navigation context" when applied conditionally
// (class toggled on re-render) inside a Stack screen on the new arch.
// Replace with plain React Native shadow style object instead.
const TOGGLE_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,           // Android
};

const CATEGORIES = [
  { label: 'Food', icon: 'fast-food-outline', color: '#6366f1', bg: '#eef2ff' },
  { label: 'Transport', icon: 'car-outline', color: '#06b6d4', bg: '#ecfeff' },
  { label: 'Entertainment', icon: 'musical-notes-outline', color: '#f43f5e', bg: '#fff1f2' },
  { label: 'Shopping', icon: 'bag-outline', color: '#f59e0b', bg: '#fffbeb' },
  { label: 'Education', icon: 'book-outline', color: '#10b981', bg: '#ecfdf5' },
  { label: 'Health', icon: 'heart-outline', color: '#ec4899', bg: '#fdf2f8' },
  { label: 'Housing', icon: 'home-outline', color: '#8b5cf6', bg: '#f5f3ff' },
  { label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#94a3b8', bg: '#f8fafc' },
];

export default function AddExpense() {
  const router = useRouter();   // hook — always bound to the correct nav context
  const dispatch = useDispatch();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [isExpense, setIsExpense] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleSave = async () => {
    if (!description.trim()) { setError('Please enter a description'); return; }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('Please enter a valid amount'); return; }

    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/transactions', {
        description: description.trim(),
        amount: isExpense ? -Math.abs(parsed) : Math.abs(parsed),
        category,
        date: today,
      });
      // Refresh transactions in Redux so home page updates immediately
      await dispatch(fetchTransactions());
      Alert.alert('Added!', `${isExpense ? 'Expense' : 'Income'} recorded successfully.`, [
        { text: 'Add Another', onPress: () => { setDescription(''); setAmount(''); setCategory('Other'); setError(''); } },
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.label === category) || CATEGORIES[7];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Add Transaction</Text>
        </View>

        <ScrollView className="px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Type toggle
            NativeWind 4.x / new-arch: shadow-* classes go through the CSS
            interop which internally calls useNavigationContainerContext().
            Use native RN shadow props via `style` instead.
          */}
          <View className="flex-row bg-slate-100 rounded-2xl p-1 mb-5">
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-xl items-center ${isExpense ? 'bg-white' : ''}`}
              style={isExpense ? TOGGLE_SHADOW : null}
              onPress={() => setIsExpense(true)}
            >
              <Text className={`text-sm font-semibold ${isExpense ? 'text-rose-500' : 'text-slate-400'}`}>
                💸 Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2.5 rounded-xl items-center ${!isExpense ? 'bg-white' : ''}`}
              style={!isExpense ? TOGGLE_SHADOW : null}
              onPress={() => setIsExpense(false)}
            >
              <Text className={`text-sm font-semibold ${!isExpense ? 'text-emerald-500' : 'text-slate-400'}`}>
                💰 Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View className="bg-indigo-600 rounded-2xl p-5 items-center mb-5">
            <Text className="text-indigo-200 text-xs font-medium mb-2">Amount (£)</Text>
            <View className="flex-row items-center">
              <Text className="text-white text-4xl font-bold mr-1">£</Text>
              <TextInput
                className="text-white text-4xl font-bold min-w-16"
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={{ color: 'white', fontSize: 36, fontWeight: 'bold' }}
              />
            </View>
          </View>

          {/* Description */}
          <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">Description</Text>
          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4">
            <Ionicons name="create-outline" size={18} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-slate-800 text-base"
              placeholder="e.g. Tesco grocery run"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Category */}
          <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">Category</Text>
          <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                onPress={() => setCategory(cat.label)}
                style={{ backgroundColor: category === cat.label ? cat.bg : '#f8fafc' }}
                className={`flex-row items-center px-3 py-2 rounded-xl border ${category === cat.label ? 'border-indigo-300' : 'border-slate-200'}`}
              >
                <Ionicons name={cat.icon} size={14} color={category === cat.label ? cat.color : '#94a3b8'} />
                <Text className={`text-xs font-medium ml-1 ${category === cat.label ? 'text-slate-700' : 'text-slate-400'}`}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date */}
          <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">Date</Text>
          <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5">
            <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
            <Text className="ml-3 text-slate-600 text-base">{today}</Text>
            <Text className="ml-auto text-slate-400 text-xs">Today</Text>
          </View>

          {/* Error */}
          {error ? (
            <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
              <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
              <Text className="text-rose-500 text-sm ml-2">{error}</Text>
            </View>
          ) : null}

          {/* Save Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center mb-8 ${isExpense ? 'bg-indigo-600' : 'bg-emerald-500'}`}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text className="text-white text-base font-bold">
                {isExpense ? 'Save Expense' : 'Save Income'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
