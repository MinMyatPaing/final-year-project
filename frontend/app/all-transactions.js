import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { fetchTransactions } from '../store/transactionSlice';
import '../global.css';

const CATEGORY_CONFIG = {
  Food: { icon: 'fast-food-outline', color: '#6366f1', bg: '#eef2ff' },
  Transport: { icon: 'car-outline', color: '#06b6d4', bg: '#ecfeff' },
  Entertainment: { icon: 'musical-notes-outline', color: '#f43f5e', bg: '#fff1f2' },
  Shopping: { icon: 'bag-outline', color: '#f59e0b', bg: '#fffbeb' },
  Education: { icon: 'book-outline', color: '#10b981', bg: '#ecfdf5' },
  Health: { icon: 'heart-outline', color: '#ec4899', bg: '#fdf2f8' },
  Housing: { icon: 'home-outline', color: '#8b5cf6', bg: '#f5f3ff' },
  Other: { icon: 'ellipsis-horizontal-outline', color: '#94a3b8', bg: '#f8fafc' },
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TransactionRow({ item }) {
  const isPositive = parseFloat(item.amount) >= 0;
  const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Other;
  return (
    <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-2 shadow-sm">
      <View style={{ backgroundColor: cfg.bg }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View className="flex-1">
        <Text className="text-slate-800 text-sm font-semibold" numberOfLines={1}>{item.description}</Text>
        <Text className="text-slate-400 text-xs mt-0.5">{item.category} · {formatDate(item.date)}</Text>
      </View>
      <Text className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-slate-700'}`}>
        {isPositive ? '+' : ''}£{Math.abs(parseFloat(item.amount)).toFixed(2)}
      </Text>
    </View>
  );
}

export default function AllTransactions() {
  const router = useRouter();
  const dispatch = useDispatch();
  const transactions = useSelector((s) => s.transaction.transactions);
  const loading = useSelector((s) => s.transaction.transactionsLoading);

  useEffect(() => {
    if (transactions.length === 0) dispatch(fetchTransactions());
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">All Transactions</Text>
        <Text className="ml-auto text-slate-400 text-sm">{transactions.length} total</Text>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, i) => item._id?.toString() || i.toString()}
          renderItem={({ item }) => <TransactionRow item={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
              <Text className="text-slate-400 text-base mt-3">No transactions yet</Text>
              <Text className="text-slate-300 text-sm mt-1">Upload a bank statement to get started</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
