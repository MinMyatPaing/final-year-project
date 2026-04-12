import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import '../global.css';

const CATEGORY_BUDGETS = [
  { label: 'Food & Groceries', icon: 'fast-food-outline', color: '#6366f1', bg: '#eef2ff', spent: 52.99, limit: 150 },
  { label: 'Transport', icon: 'car-outline', color: '#06b6d4', bg: '#ecfeff', spent: 15.25, limit: 60 },
  { label: 'Entertainment', icon: 'musical-notes-outline', color: '#f43f5e', bg: '#fff1f2', spent: 3.9, limit: 40 },
  { label: 'Shopping', icon: 'bag-outline', color: '#f59e0b', bg: '#fffbeb', spent: 23.08, limit: 80 },
  { label: 'Education', icon: 'book-outline', color: '#10b981', bg: '#ecfdf5', spent: 0, limit: 50 },
  { label: 'Housing', icon: 'home-outline', color: '#8b5cf6', bg: '#f5f3ff', spent: 500, limit: 500 },
];

const AI_SUGGESTIONS = [
  { icon: 'trending-down-outline', color: '#10b981', text: 'You spent 35% less on transport last week. Keep it up!' },
  { icon: 'alert-circle-outline', color: '#f59e0b', text: 'You\'re on track to exceed your Shopping budget by £18 this month.' },
  { icon: 'bulb-outline', color: '#6366f1', text: 'Setting aside £200/month could build a 3-month emergency fund in a year.' },
];

function BudgetBar({ spent, limit }) {
  const pct = Math.min((spent / limit) * 100, 100);
  const over = spent > limit;
  return (
    <View className="mt-2">
      <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <View
          style={{ width: `${pct}%`, backgroundColor: over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#6366f1' }}
          className="h-full rounded-full"
        />
      </View>
      <View className="flex-row justify-between mt-0.5">
        <Text className="text-slate-400 text-xs">£{spent.toFixed(0)} spent</Text>
        <Text className={`text-xs font-medium ${over ? 'text-rose-500' : 'text-slate-400'}`}>
          {over ? `£${(spent - limit).toFixed(0)} over` : `£${(limit - spent).toFixed(0)} left`}
        </Text>
      </View>
    </View>
  );
}

export default function Budget() {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [autoSave, setAutoSave] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Budget Planner</Text>
      </View>

      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
        {/* Monthly Budget Goal */}
        <View className="bg-indigo-600 rounded-2xl p-5 mb-5">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-indigo-200 text-xs font-medium">Monthly Budget Goal</Text>
            <TouchableOpacity className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-semibold">Edit</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-white text-3xl font-bold">£1,000</Text>
          <View className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <View className="h-full bg-white rounded-full" style={{ width: '63%' }} />
          </View>
          <View className="flex-row justify-between mt-1.5">
            <Text className="text-indigo-200 text-xs">£630 spent</Text>
            <Text className="text-indigo-200 text-xs">£370 remaining</Text>
          </View>
        </View>

        {/* Savings Threshold */}
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="wallet-outline" size={18} color="#6366f1" />
            <Text className="text-slate-800 font-bold text-sm ml-2">Savings Threshold</Text>
          </View>
          <Text className="text-slate-500 text-sm mb-3">Set a monthly savings target to set aside automatically.</Text>
          {[
            { label: 'Savings Target', value: '£200 / month', icon: 'trending-up-outline', color: '#10b981' },
            { label: 'Emergency Fund Goal', value: '£1,200', icon: 'shield-checkmark-outline', color: '#6366f1' },
            { label: 'Progress', value: '£480 saved (40%)', icon: 'pie-chart-outline', color: '#f59e0b' },
          ].map((item, i) => (
            <View key={i} className="flex-row items-center py-2.5 border-b border-slate-50">
              <Ionicons name={item.icon} size={16} color={item.color} />
              <Text className="flex-1 text-slate-600 text-sm ml-2">{item.label}</Text>
              <Text className="text-slate-700 text-sm font-semibold">{item.value}</Text>
              <Ionicons name="chevron-forward" size={14} color="#cbd5e1" className="ml-1" />
            </View>
          ))}
        </View>

        {/* Category Budgets */}
        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">Category Budgets</Text>
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          {CATEGORY_BUDGETS.map((cat, i) => (
            <View key={i} className={i < CATEGORY_BUDGETS.length - 1 ? 'mb-4' : ''}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View style={{ backgroundColor: cat.bg }} className="w-8 h-8 rounded-xl items-center justify-center mr-2">
                    <Ionicons name={cat.icon} size={15} color={cat.color} />
                  </View>
                  <Text className="text-slate-700 text-sm font-medium">{cat.label}</Text>
                </View>
                <Text className="text-slate-500 text-xs">/ £{cat.limit}</Text>
              </View>
              <BudgetBar spent={cat.spent} limit={cat.limit} />
            </View>
          ))}
          <TouchableOpacity className="mt-3 flex-row items-center justify-center py-2.5 border border-dashed border-indigo-300 rounded-xl">
            <Ionicons name="add" size={16} color="#6366f1" />
            <Text className="text-indigo-500 text-sm font-medium ml-1">Add Category Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Smart Alerts */}
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <Text className="text-slate-800 font-bold text-sm mb-3">Smart Alerts</Text>
          {[
            { label: 'Budget limit alerts', sub: 'Notify when 80% of a budget is reached', value: alertsEnabled, onChange: setAlertsEnabled },
            { label: 'Auto-save reminders', sub: 'Monthly reminder to move savings', value: autoSave, onChange: setAutoSave },
          ].map((item, i) => (
            <View key={i} className={`flex-row items-center justify-between ${i === 0 ? 'mb-3 pb-3 border-b border-slate-50' : ''}`}>
              <View className="flex-1 mr-3">
                <Text className="text-slate-700 text-sm font-medium">{item.label}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">{item.sub}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: '#e2e8f0', true: '#a5b4fc' }}
                thumbColor={item.value ? '#4f46e5' : '#f1f5f9'}
              />
            </View>
          ))}
        </View>

        {/* AI Suggestions */}
        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">AI Suggestions</Text>
        {AI_SUGGESTIONS.map((s, i) => (
          <View key={i} className="bg-white rounded-xl shadow-sm p-4 mb-2 flex-row items-start">
            <Ionicons name={s.icon} size={20} color={s.color} />
            <Text className="flex-1 text-slate-600 text-sm ml-2 leading-5">{s.text}</Text>
          </View>
        ))}

        {/* Reports */}
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-8 mt-2">
          <Text className="text-slate-800 font-bold text-sm mb-3">Spending Reports</Text>
          {[
            { label: 'Monthly Summary', icon: 'bar-chart-outline', color: '#6366f1' },
            { label: 'Category Breakdown', icon: 'pie-chart-outline', color: '#06b6d4' },
            { label: 'Trends Over Time', icon: 'trending-up-outline', color: '#10b981' },
          ].map((item, i) => (
            <TouchableOpacity key={i} className="flex-row items-center py-3 border-b border-slate-50 last:border-0">
              <Ionicons name={item.icon} size={18} color={item.color} />
              <Text className="flex-1 text-slate-600 text-sm ml-2">{item.label}</Text>
              <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
