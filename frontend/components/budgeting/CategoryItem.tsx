import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { SpendingCategory } from '@/types/budgeting';
import { formatCurrency } from '@/data/mockData';
import { IconSymbol } from '../ui/icon-symbol';

interface CategoryItemProps {
  category: SpendingCategory;
}

const getCategoryColor = (categoryName: string): string => {
  const colors: Record<string, string> = {
    'Groceries': '#FB923C', // Orange
    'Shopping': '#60A5FA', // Light blue
    'Eating Out': '#EF4444', // Red
    'Transport': '#60A5FA', // Light blue
  };
  return colors[categoryName] || '#6B7280';
};

export function CategoryItem({ category }: CategoryItemProps) {
  const color = getCategoryColor(category.name);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <IconSymbol
            name={category.icon as any}
            size={24}
            color={color}
          />
        </View>
        <View style={styles.infoContainer}>
          <ThemedText type="defaultSemiBold" style={styles.categoryName}>
            {category.name}
          </ThemedText>
          <ThemedText style={styles.transactionCount} lightColor="#666" darkColor="#999">
            {category.transactionCount} transaction{category.transactionCount !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </View>
      <View style={styles.rightSection}>
        <ThemedText type="defaultSemiBold" style={styles.amount}>
          {formatCurrency(category.totalAmount, 'GBP')}
        </ThemedText>
        <ThemedText style={styles.percentage} lightColor="#666" darkColor="#999">
          {category.percentage.toFixed(1)}%
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    marginBottom: 4,
  },
  transactionCount: {
    fontSize: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    marginBottom: 4,
  },
  percentage: {
    fontSize: 12,
  },
});

