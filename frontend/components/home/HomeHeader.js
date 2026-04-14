import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from '../../utils/budgetNotifications';

// ─── Month helpers ────────────────────────────────────────────────────────────
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMonthLabel(year, month) {
  return `${MONTHS[month]} ${year}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeHeader({
  user,
  transactions,
  onMonthChange,
}) {
  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';

  // ── Selected month state (defaults to current month) ──────────────────────
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  // Notify parent whenever month changes
  useEffect(() => {
    onMonthChange?.(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    const isCurrentMonth =
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
    if (isCurrentMonth) return; // don't go into the future
    if (selectedMonth === 11) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  // ── Filter transactions to selected month ─────────────────────────────────
  const monthTxns = (transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  const totalIncome = monthTxns
    .filter((t) => parseFloat(t.amount) > 0)
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const totalExpenses = monthTxns
    .filter((t) => parseFloat(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);

  // ── Notification permission state ─────────────────────────────────────────
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === 'granted');
    });
  }, []);

  const handleNotifPress = async () => {
    if (notifGranted) {
      Alert.alert(
        '🔔 Notifications Active',
        'You will be alerted when:\n\n• Any category reaches 80% of its limit\n• Any category exceeds its limit\n• Your total monthly spend hits 80% or exceeds your budget\n\nAlerts fire at most once per category per calendar month.',
        [{ text: 'OK' }]
      );
      return;
    }
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (!granted) {
      Alert.alert(
        'Notifications Blocked',
        'To receive budget alerts, please enable notifications for this app in your device Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      Alert.alert('🔔 Notifications Enabled!', "You'll now get alerts when you're approaching or exceeding your budget limits.", [{ text: 'Great!' }]);
    }
  };

  return (
    <View className="px-5 pt-4 pb-20">
      {/* Top row */}
      <View className="flex-row justify-between items-center mb-4">
        <View>
          <Text className="text-indigo-200 text-sm">Good morning 👋</Text>
          <Text className="text-white text-xl font-bold mt-0.5">{displayName}</Text>
        </View>
        <TouchableOpacity
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          onPress={handleNotifPress}
          activeOpacity={0.75}
        >
          {notifGranted ? (
            <View style={{ position: 'relative' }}>
              <Ionicons name="notifications" size={20} color="white" />
              <View
                style={{
                  position: 'absolute', top: -1, right: -1,
                  width: 7, height: 7, borderRadius: 4,
                  backgroundColor: '#34d399', borderWidth: 1, borderColor: '#4f46e5',
                }}
              />
            </View>
          ) : (
            <Ionicons name="notifications-outline" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>

      {/* Month selector */}
      <View className="flex-row items-center justify-center mb-3">
        <TouchableOpacity onPress={goToPrevMonth} className="p-2">
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text className="text-white font-semibold text-sm mx-3">
          {formatMonthLabel(selectedYear, selectedMonth)}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          className="p-2"
          disabled={isCurrentMonth}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isCurrentMonth ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'}
          />
        </TouchableOpacity>
      </View>

      {/* Spending Card */}
      <View className="bg-white/15 rounded-2xl p-4">
        <Text className="text-indigo-200 text-xs font-medium">
          Total Spending · {formatMonthLabel(selectedYear, selectedMonth)}
        </Text>
        <Text className="text-white text-3xl font-bold mt-1">
          £{totalExpenses.toFixed(2)}
        </Text>
        <View className="flex-row mt-4" style={{ gap: 12 }}>
          <View className="flex-1 bg-white/10 rounded-xl p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-5 h-5 bg-emerald-400/30 rounded-full items-center justify-center mr-1.5">
                <Ionicons name="arrow-down" size={10} color="#34d399" />
              </View>
              <Text className="text-indigo-200 text-xs">Income</Text>
            </View>
            <Text className="text-white text-base font-bold">
              £{totalIncome.toFixed(2)}
            </Text>
          </View>
          <View className="flex-1 bg-white/10 rounded-xl p-3">
            <View className="flex-row items-center mb-1">
              <View className="w-5 h-5 bg-slate-400/30 rounded-full items-center justify-center mr-1.5">
                <Ionicons name="receipt-outline" size={10} color="#cbd5e1" />
              </View>
              <Text className="text-indigo-200 text-xs">Transactions</Text>
            </View>
            <Text className="text-white text-base font-bold">{monthTxns.length}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
