import { FlatList, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_CONFIG = {
  Food: { icon: 'fast-food-outline', color: '#6366f1', bg: '#eef2ff' },
  Transport: { icon: 'car-outline', color: '#06b6d4', bg: '#ecfeff' },
  Entertainment: { icon: 'musical-notes-outline', color: '#f43f5e', bg: '#fff1f2' },
  Shopping: { icon: 'bag-outline', color: '#f59e0b', bg: '#fffbeb' },
  Education: { icon: 'book-outline', color: '#10b981', bg: '#ecfdf5' },
  Health: { icon: 'heart-outline', color: '#ec4899', bg: '#fdf2f8' },
  Other: { icon: 'ellipsis-horizontal-outline', color: '#94a3b8', bg: '#f8fafc' },
};

const SAMPLE_TRANSACTIONS = [
  {
    id: '1',
    description: 'Tesco Supermarket',
    amount: -42.5,
    category: 'Food',
    date: '2026-02-24',
  },
  {
    id: '2',
    description: 'Student Loan Installment',
    amount: 1200.0,
    category: 'Other',
    date: '2026-02-22',
  },
  {
    id: '3',
    description: 'Bus Pass – Monthly',
    amount: -55.0,
    category: 'Transport',
    date: '2026-02-20',
  },
  {
    id: '4',
    description: 'Netflix Subscription',
    amount: -15.99,
    category: 'Entertainment',
    date: '2026-02-18',
  },
  {
    id: '5',
    description: 'University Textbooks',
    amount: -78.0,
    category: 'Education',
    date: '2026-02-15',
  },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function TransactionItem({ item }) {
  const isPositive = parseFloat(item.amount) >= 0;
  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Other;

  return (
    <View className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-2 shadow-sm">
      {/* Category Icon */}
      <View
        style={{ backgroundColor: config.bg }}
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
      >
        <Ionicons name={config.icon} size={18} color={config.color} />
      </View>

      {/* Description & Category */}
      <View className="flex-1">
        <Text className="text-slate-800 text-sm font-semibold" numberOfLines={1}>
          {item.description}
        </Text>
        <Text className="text-slate-400 text-xs mt-0.5">
          {item.category || 'Other'} · {formatDate(item.date)}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-slate-700'}`}
      >
        {isPositive ? '+' : ''}£{Math.abs(parseFloat(item.amount || 0)).toFixed(2)}
      </Text>
    </View>
  );
}

export default function TransactionList({ transactions }) {
  const data =
    !transactions || transactions.length === 0 ? SAMPLE_TRANSACTIONS : transactions;

  return (
    <FlatList
      data={data}
      keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
      renderItem={({ item }) => <TransactionItem item={item} />}
      scrollEnabled={false}
      ListEmptyComponent={
        <View className="items-center py-8">
          <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
          <Text className="text-slate-400 text-sm mt-2">No transactions yet</Text>
        </View>
      }
    />
  );
}
