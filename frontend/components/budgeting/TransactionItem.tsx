import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Transaction } from '@/types/budgeting';
import { formatCurrency, formatDate } from '@/data/mockData';
import { IconSymbol } from '../ui/icon-symbol';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

type TransactionIconName =
  | 'fork.knife'
  | 'bag.fill'
  | 'car.fill'
  | 'creditcard.fill';

const getTransactionIcon = (category: string): TransactionIconName => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('food') || categoryLower.includes('dining') || categoryLower.includes('groceries') || categoryLower.includes('eating')) {
    return 'fork.knife';
  } else if (categoryLower.includes('shopping')) {
    return 'bag.fill';
  } else if (categoryLower.includes('transportation') || categoryLower.includes('transport')) {
    return 'car.fill';
  } else {
    return 'creditcard.fill';
  }
};

const getCategoryColor = (category: string): string => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('groceries')) {
    return '#FB923C'; // Orange
  } else if (categoryLower.includes('shopping')) {
    return '#60A5FA'; // Light blue
  } else if (categoryLower.includes('eating')) {
    return '#EF4444'; // Red
  } else if (categoryLower.includes('transport')) {
    return '#60A5FA'; // Light blue
  }
  return '#6B7280';
};

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const iconName = getTransactionIcon(transaction.category);
  const categoryColor = getCategoryColor(transaction.category);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
        <IconSymbol
          name={iconName}
          size={20}
          color={categoryColor}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <ThemedText type="defaultSemiBold" style={styles.description}>
            {transaction.merchant || transaction.description}
          </ThemedText>
          <ThemedText style={styles.category} lightColor="#666" darkColor="#999">
            {transaction.category}
          </ThemedText>
        </View>
        <View style={styles.amountContainer}>
          <ThemedText style={styles.amount} type="defaultSemiBold">
            {formatCurrency(transaction.amount, transaction.currency)}
          </ThemedText>
          <ThemedText style={styles.date} lightColor="#999" darkColor="#666">
            {formatDate(transaction.date)}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainInfo: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 15,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
  },
});

