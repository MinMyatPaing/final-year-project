import { View, Text } from 'react-native';

export default function StatsCard({ txCount, totalSpent, categories }) {
  return (
    <View className="mx-4 -mt-7 bg-white rounded-2xl shadow-md p-4 mb-5">
      <View className="flex-row justify-around">
        <View className="items-center">
          <Text className="text-indigo-600 text-xl font-bold">{txCount || 0}</Text>
          <Text className="text-slate-400 text-xs mt-0.5">Transactions</Text>
        </View>
        <View className="w-px bg-slate-100" />
        <View className="items-center">
          <Text className="text-indigo-600 text-xl font-bold">
            £{totalSpent.toFixed(0)}
          </Text>
          <Text className="text-slate-400 text-xs mt-0.5">Total Spent</Text>
        </View>
        <View className="w-px bg-slate-100" />
        <View className="items-center">
          <Text className="text-indigo-600 text-xl font-bold">{categories || 0}</Text>
          <Text className="text-slate-400 text-xs mt-0.5">Categories</Text>
        </View>
      </View>
    </View>
  );
}
