import {
  View, Text, TouchableOpacity, ScrollView,
  Switch, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../global.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const BUDGET_LIMITS_KEY = 'pocketwise_limits';

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

/**
 * Budget categories — labels match the Transaction.js enum exactly so that
 * category spending totals line up with stored transaction data.
 * The matches array keeps a few legacy aliases (e.g. 'food', 'housing') so
 * that any transactions stored before this update still count correctly.
 */
const BUDGET_CATEGORIES = [
  {
    label: 'Groceries',
    icon: 'cart-outline',
    color: '#6366f1',
    bg: '#eef2ff',
    matches: ['groceries', 'food'],
  },
  {
    label: 'Eating Out',
    icon: 'restaurant-outline',
    color: '#f97316',
    bg: '#fff7ed',
    matches: ['eating out', 'eat out'],
  },
  {
    label: 'Transport',
    icon: 'car-outline',
    color: '#06b6d4',
    bg: '#ecfeff',
    matches: ['transport', 'transportation'],
  },
  {
    label: 'Entertainment',
    icon: 'musical-notes-outline',
    color: '#f43f5e',
    bg: '#fff1f2',
    matches: ['entertainment'],
  },
  {
    label: 'Shopping',
    icon: 'bag-outline',
    color: '#f59e0b',
    bg: '#fffbeb',
    matches: ['shopping'],
  },
  {
    label: 'Education',
    icon: 'book-outline',
    color: '#10b981',
    bg: '#ecfdf5',
    matches: ['education'],
  },
  {
    label: 'Bills & Utilities',
    icon: 'home-outline',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    matches: ['bills & utilities', 'housing', 'bills', 'utilities'],
  },
  {
    label: 'Healthcare',
    icon: 'heart-outline',
    color: '#ec4899',
    bg: '#fdf2f8',
    matches: ['healthcare', 'health'],
  },
  {
    label: 'Personal Care',
    icon: 'person-outline',
    color: '#14b8a6',
    bg: '#f0fdfa',
    matches: ['personal care'],
  },
  {
    // Catch-all: anything that doesn't match a named budget above.
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    color: '#94a3b8',
    bg: '#f8fafc',
    matches: ['other'],
  },
];

const DEFAULT_LIMITS = {
  Groceries:           150,
  'Eating Out':         80,
  Transport:            60,
  Entertainment:        40,
  Shopping:             80,
  Education:            50,
  'Bills & Utilities': 500,
  Healthcare:           30,
  'Personal Care':      30,
  Other:                50,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Map a transaction's category string to a budget display-category label.
 *
 * The "Other" entry in BUDGET_CATEGORIES acts as a catch-all: anything that
 * doesn't match a named category (including transactions explicitly saved with
 * category "Other" in add-expense.js) maps to 'Other' so it still appears in
 * the budget totals.  We skip 'Other' in the main loop and use it as the
 * explicit fallback so it captures both the exact string "other" AND any
 * unrecognised category label from the AI categoriser.
 */
function matchCategory(txnCategory) {
  const lower = (txnCategory || '').toLowerCase().trim();
  for (const cat of BUDGET_CATEGORIES) {
    if (cat.label === 'Other') continue;   // process catch-all last
    if (cat.matches.some((m) => lower === m || lower.includes(m) || m.includes(lower))) {
      return cat.label;
    }
  }
  return 'Other'; // catch-all — includes explicit "Other" + unknown AI labels
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BudgetBar({ spent, limit }) {
  const pct = Math.min((spent / (limit || 1)) * 100, 100);
  const over = spent > limit;
  return (
    <View className="mt-2">
      <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <View
          style={{
            width: `${pct}%`,
            backgroundColor: over ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#6366f1',
          }}
          className="h-full rounded-full"
        />
      </View>
      <View className="flex-row justify-between mt-0.5">
        <Text className="text-slate-400 text-xs">£{spent.toFixed(0)} spent</Text>
        <Text className={`text-xs font-medium ${over ? 'text-rose-500' : 'text-slate-400'}`}>
          {over
            ? `£${(spent - limit).toFixed(0)} over`
            : `£${(limit - spent).toFixed(0)} left`}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function Budget() {
  const { transactions } = useSelector((state) => state.transaction);

  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  const [editLimits, setEditLimits] = useState(DEFAULT_LIMITS);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  // ─── Month picker (same pattern as Reports / HomeHeader) ─────────────────
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear((y) => y - 1); setSelectedMonth(11); }
    else setSelectedMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedYear((y) => y + 1); setSelectedMonth(0); }
    else setSelectedMonth((m) => m + 1);
  };

  // ─── Load persisted limits on mount ──────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(BUDGET_LIMITS_KEY).then((val) => {
      if (val) {
        // Merge saved limits with DEFAULT_LIMITS so that newly-added
        // categories (e.g. 'Other') always get a sensible default even
        // for users who saved their limits before this category existed.
        const merged = { ...DEFAULT_LIMITS, ...JSON.parse(val) };
        setLimits(merged);
        setEditLimits(merged);
      }
    });
  }, []);

  // ─── Calculate selected-month spending per category ──────────────────────
  const { categorySpending, totalSpent, totalBudget, overCategories } = useMemo(() => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd   = new Date(selectedYear, selectedMonth + 1, 1); // exclusive

    const spending = {};
    BUDGET_CATEGORIES.forEach((c) => { spending[c.label] = 0; });

    (transactions || []).forEach((t) => {
      const amt = parseFloat(t.amount);
      if (isNaN(amt) || amt >= 0) return; // skip income / bad data
      const d = new Date(t.date);
      if (d < monthStart || d >= monthEnd) return; // only selected month

      const cat = matchCategory(t.category);
      if (cat) spending[cat] += Math.abs(amt);
    });

    const totalSpent   = Object.values(spending).reduce((a, b) => a + b, 0);
    const totalBudget  = Object.values(limits).reduce((a, b) => a + b, 0);
    const overCategories = BUDGET_CATEGORIES.filter(
      (c) => (spending[c.label] || 0) > (limits[c.label] || Infinity)
    );

    return { categorySpending: spending, totalSpent, totalBudget, overCategories };
  }, [transactions, limits, selectedYear, selectedMonth]);

  const totalPct = Math.min((totalSpent / (totalBudget || 1)) * 100, 100);

  // ─── Save edited limits ───────────────────────────────────────────────────
  const saveEditedLimits = async () => {
    setLimits(editLimits);
    await AsyncStorage.setItem(BUDGET_LIMITS_KEY, JSON.stringify(editLimits));
    setEditModalVisible(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      {/* ── Edit Limits Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        >
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <Text className="text-slate-800 font-bold text-lg mb-1">Edit Monthly Limits</Text>
            <Text className="text-slate-400 text-xs mb-4">Tap a value to change it</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {BUDGET_CATEGORIES.map((cat) => (
                <View key={cat.label} className="flex-row items-center mb-3">
                  <View
                    style={{ backgroundColor: cat.bg }}
                    className="w-8 h-8 rounded-xl items-center justify-center mr-3"
                  >
                    <Ionicons name={cat.icon} size={15} color={cat.color} />
                  </View>
                  <Text className="flex-1 text-slate-700 text-sm">{cat.label}</Text>
                  <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-1.5">
                    <Text className="text-slate-500 text-sm mr-1">£</Text>
                    <TextInput
                      value={String(editLimits[cat.label] ?? '')}
                      onChangeText={(v) =>
                        setEditLimits((prev) => ({
                          ...prev,
                          [cat.label]: parseFloat(v) || 0,
                        }))
                      }
                      keyboardType="numeric"
                      selectTextOnFocus
                      style={{ width: 60, color: '#1e293b', fontSize: 14, fontWeight: '600' }}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={saveEditedLimits}
              className="bg-indigo-600 rounded-xl py-3.5 items-center mt-4"
            >
              <Text className="text-white font-bold text-base">Save Limits</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              className="items-center mt-3"
            >
              <Text className="text-slate-400 text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Budget Planner</Text>
      </View>

      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>

        {/* ── Monthly Overview Card ──────────────────────────────────────── */}
        <View className="bg-indigo-600 rounded-2xl p-5 mb-5">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-indigo-200 text-xs font-medium">Monthly Budget</Text>
            <TouchableOpacity
              className="bg-white/20 px-3 py-1 rounded-full"
              onPress={() => { setEditLimits(limits); setEditModalVisible(true); }}
            >
              <Text className="text-white text-xs font-semibold">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* ── Month picker ──────────────────────────────────────────── */}
          <View className="flex-row items-center justify-center mb-3">
            <TouchableOpacity onPress={goToPrevMonth} className="p-1.5">
              <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <Text className="text-white font-semibold text-sm mx-4">
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity
              onPress={goToNextMonth}
              disabled={isCurrentMonth}
              className="p-1.5"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isCurrentMonth ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.8)'}
              />
            </TouchableOpacity>
          </View>

          <Text className="text-white text-3xl font-bold">£{totalBudget.toFixed(0)}</Text>
          <View className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <View
              className="h-full bg-white rounded-full"
              style={{ width: `${totalPct}%` }}
            />
          </View>
          <View className="flex-row justify-between mt-1.5">
            <Text className="text-indigo-200 text-xs">£{totalSpent.toFixed(0)} spent</Text>
            <Text className="text-indigo-200 text-xs">
              {totalSpent > totalBudget
                ? `£${(totalSpent - totalBudget).toFixed(0)} over budget`
                : `£${(totalBudget - totalSpent).toFixed(0)} remaining`}
            </Text>
          </View>
        </View>

        {/* ── Over-budget warning ────────────────────────────────────────── */}
        {overCategories.length > 0 && (
          <View className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-2">
              <Ionicons name="alert-circle" size={18} color="#f43f5e" />
              <Text className="text-rose-600 font-bold text-sm ml-2">Over Budget</Text>
            </View>
            {overCategories.map((c) => (
              <Text key={c.label} className="text-rose-500 text-sm">
                • {c.label}:{' '}
                £{((categorySpending[c.label] || 0) - (limits[c.label] || 0)).toFixed(0)} over
              </Text>
            ))}
          </View>
        )}

        {/* ── Category Bars ──────────────────────────────────────────────── */}
        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
          Spending This Month
        </Text>
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          {BUDGET_CATEGORIES.map((cat, i) => {
            const spent = categorySpending[cat.label] || 0;
            const limit = limits[cat.label] || 0;
            return (
              <View
                key={cat.label}
                className={i < BUDGET_CATEGORIES.length - 1 ? 'mb-4' : ''}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      style={{ backgroundColor: cat.bg }}
                      className="w-8 h-8 rounded-xl items-center justify-center mr-2"
                    >
                      <Ionicons name={cat.icon} size={15} color={cat.color} />
                    </View>
                    <Text className="text-slate-700 text-sm font-medium">{cat.label}</Text>
                  </View>
                  <Text className="text-slate-500 text-xs">/ £{limit}</Text>
                </View>
                <BudgetBar spent={spent} limit={limit} />
              </View>
            );
          })}

          <TouchableOpacity
            onPress={() => { setEditLimits(limits); setEditModalVisible(true); }}
            className="mt-3 flex-row items-center justify-center py-2.5 border border-dashed border-indigo-300 rounded-xl"
          >
            <Ionicons name="create-outline" size={15} color="#6366f1" />
            <Text className="text-indigo-500 text-sm font-medium ml-1">
              Adjust Budget Limits
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Smart Alerts ───────────────────────────────────────────────── */}
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-8">
          <Text className="text-slate-800 font-bold text-sm mb-3">Smart Alerts</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-slate-700 text-sm font-medium">Budget limit alerts</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Notify when 80% of a budget is reached
              </Text>
            </View>
            <Switch
              value={alertsEnabled}
              onValueChange={setAlertsEnabled}
              trackColor={{ false: '#e2e8f0', true: '#a5b4fc' }}
              thumbColor={alertsEnabled ? '#4f46e5' : '#f1f5f9'}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
