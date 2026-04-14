import { View, Text } from 'react-native';
import PieChart from '../PieChart';

export default function SpendingOverview({ transactions, selectedYear, selectedMonth }) {
  // Filter to the selected month
  const monthTxns = (transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const label = selectedYear !== undefined && selectedMonth !== undefined
    ? `${MONTHS[selectedMonth]} ${selectedYear}`
    : 'This Month';

  return (
    <View className="mx-4 bg-white rounded-2xl shadow-sm p-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-slate-800 text-base font-bold">Spending Overview</Text>
        <View className="bg-indigo-50 px-3 py-1 rounded-full">
          <Text className="text-indigo-500 text-xs font-medium">{label}</Text>
        </View>
      </View>
      <PieChart transactions={monthTxns} />
    </View>
  );
}
