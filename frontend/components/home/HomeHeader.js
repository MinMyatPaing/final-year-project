import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeHeader({ user, totalExpenses, totalIncome, txCount }) {
  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <View className="px-5 pt-4 pb-20">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-indigo-200 text-sm">Good morning 👋</Text>
          <Text className="text-white text-xl font-bold mt-0.5">{displayName}</Text>
        </View>
        <TouchableOpacity
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          onPress={() =>
            Alert.alert(
              '🔔 Enable Notifications',
              "Get notified when you're about to exceed your planned budget. Stay on track with smart spending alerts.",
              [{ text: 'Not Now', style: 'cancel' }, { text: 'Enable', onPress: () => {} }]
            )
          }
        >
          <Ionicons name="notifications-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Spending Card */}
      <View className="bg-white/15 rounded-2xl p-4">
        <Text className="text-indigo-200 text-xs font-medium">Total Spending</Text>
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
            <Text className="text-white text-base font-bold">{txCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
