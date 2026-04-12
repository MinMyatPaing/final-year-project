import { View, Text, TouchableOpacity } from 'react-native';
import PieChart from '../PieChart';

export default function SpendingOverview({ transactions }) {
  return (
    <View className="mx-4 bg-white rounded-2xl shadow-sm p-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-slate-800 text-base font-bold">Spending Overview</Text>
        <TouchableOpacity>
          <Text className="text-indigo-500 text-xs font-medium">This Month</Text>
        </TouchableOpacity>
      </View>
      <PieChart transactions={transactions} />
    </View>
  );
}
