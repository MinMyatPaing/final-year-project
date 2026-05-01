import { FlatList, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_CONFIG = {
  Groceries:          { icon: 'cart-outline',                color: '#6366f1', bg: '#eef2ff' },
  'Eating Out':       { icon: 'restaurant-outline',          color: '#f97316', bg: '#fff7ed' },
  Transport:          { icon: 'car-outline',                 color: '#06b6d4', bg: '#ecfeff' },
  Entertainment:      { icon: 'musical-notes-outline',       color: '#f43f5e', bg: '#fff1f2' },
  Shopping:           { icon: 'bag-outline',                 color: '#f59e0b', bg: '#fffbeb' },
  Education:          { icon: 'book-outline',                color: '#10b981', bg: '#ecfdf5' },
  'Bills & Utilities':{ icon: 'home-outline',                color: '#8b5cf6', bg: '#f5f3ff' },
  Healthcare:         { icon: 'heart-outline',               color: '#ec4899', bg: '#fdf2f8' },
  'Personal Care':    { icon: 'person-outline',              color: '#14b8a6', bg: '#f0fdfa' },
  Other:              { icon: 'ellipsis-horizontal-outline', color: '#94a3b8', bg: '#f8fafc' },
};

// NOTE: SAMPLE_TRANSACTIONS removed — showing fake data for new users
// is misleading (it differs from what All Transactions shows).
// The FlatList ListEmptyComponent handles the zero-state instead.

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
  return (
    <FlatList
      data={transactions || []}
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
