import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TransactionItem } from '@/components/budgeting/TransactionItem';
import { mockTransactions } from '@/data/mockData';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TransactionsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = Array.from(new Set(mockTransactions.map(t => t.category)));
  
  const filteredTransactions =
    selectedCategory === 'all'
      ? mockTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : mockTransactions
          .filter((txn) => txn.category === selectedCategory)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Transactions
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedView style={styles.filters}>
          <ThemedText style={styles.filterLabel}>Filter by category:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => setSelectedCategory('all')}
              activeOpacity={0.7}
              style={styles.filterButtonWrapper}>
              <ThemedView
                style={[
                  styles.filterButton,
                  selectedCategory === 'all' && styles.filterButtonActive,
                ]}
                lightColor={selectedCategory === 'all' ? '#2563EB' : '#F3F4F6'}
                darkColor={selectedCategory === 'all' ? '#3B82F6' : '#374151'}>
                <ThemedText
                  style={styles.filterButtonText}
                  lightColor={selectedCategory === 'all' ? '#fff' : '#11181C'}
                  darkColor={selectedCategory === 'all' ? '#fff' : '#ECEDEE'}>
                  All
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
                style={styles.filterButtonWrapper}>
                <ThemedView
                  style={[
                    styles.filterButton,
                    selectedCategory === category && styles.filterButtonActive,
                  ]}
                  lightColor={selectedCategory === category ? '#2563EB' : '#F3F4F6'}
                  darkColor={selectedCategory === category ? '#3B82F6' : '#374151'}>
                  <ThemedText
                    style={styles.filterButtonText}
                    lightColor={selectedCategory === category ? '#fff' : '#11181C'}
                    darkColor={selectedCategory === category ? '#fff' : '#ECEDEE'}>
                    {category}
                  </ThemedText>
                </ThemedView>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>

        <ThemedView style={styles.transactionsList}>
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No transactions found</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  filters: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButtonWrapper: {
    marginRight: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonActive: {
    // Active state handled by light/dark colors
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsList: {
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.5,
  },
});
