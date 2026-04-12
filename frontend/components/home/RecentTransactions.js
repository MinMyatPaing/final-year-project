import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import TransactionList from '../TransactionList';

export default function RecentTransactions({ transactions }) {
  const router = useRouter();

  return (
    <View className="mx-4 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-slate-800 text-base font-bold">Recent Transactions</Text>
        <TouchableOpacity onPress={() => router.push('/all-transactions')} activeOpacity={0.7}>
          <Text className="text-indigo-500 text-xs font-medium">See All →</Text>
        </TouchableOpacity>
      </View>
      <TransactionList transactions={transactions} />
    </View>
  );
}
