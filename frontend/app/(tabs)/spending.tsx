import { StyleSheet, ScrollView, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SpendingChart } from '@/components/budgeting/SpendingChart';
import { CategoryItem } from '@/components/budgeting/CategoryItem';
import {
  mockTransactions,
  getSpendingByCategory,
  getMonthlySpending,
  getTotalSpent,
  formatCurrency,
} from '@/data/mockData';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SpendingScreen() {
  const [viewMode, setViewMode] = useState<'categories' | 'merchants'>('categories');
  
  // Calculate spending for last year
  const lastYearTransactions = mockTransactions.filter((txn) => {
    const txnDate = new Date(txn.date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return txnDate >= oneYearAgo;
  });
  
  const totalSpentLastYear = getTotalSpent(lastYearTransactions);
  const monthlyData = getMonthlySpending(lastYearTransactions);
  const categories = getSpendingByCategory(lastYearTransactions);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Spending
          </ThemedText>
        </ThemedView>

        {/* Spent Last Year Section */}
        <ThemedView style={styles.spentSection}>
          <ThemedText style={styles.spentLabel} lightColor="#666" darkColor="#999">
            Spent last year
          </ThemedText>
          <ThemedText type="title" style={styles.spentAmount}>
            {formatCurrency(totalSpentLastYear, 'GBP')}
          </ThemedText>
          
          <SpendingChart monthlyData={monthlyData} />
        </ThemedView>

        {/* All Spending Breakdown Section */}
        <ThemedView style={styles.breakdownSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            All spending breakdown
          </ThemedText>
          
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => setViewMode('categories')}
              style={[
                styles.toggleButton,
                viewMode === 'categories' && styles.toggleButtonActive,
              ]}>
              <ThemedText
                style={[
                  styles.toggleText,
                  viewMode === 'categories' && styles.toggleTextActive,
                ]}>
                Categories
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('merchants')}
              style={[
                styles.toggleButton,
                viewMode === 'merchants' && styles.toggleButtonActive,
              ]}>
              <ThemedText
                style={[
                  styles.toggleText,
                  viewMode === 'merchants' && styles.toggleTextActive,
                ]}>
                Merchants
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedView style={styles.categoriesList}>
            {viewMode === 'categories' ? (
              categories.map((category) => (
                <CategoryItem key={category.id} category={category} />
              ))
            ) : (
              <ThemedView style={styles.emptyState}>
                <ThemedText style={styles.emptyText} lightColor="#999" darkColor="#666">
                  Merchant breakdown coming soon
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
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
  spentSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 8,
  },
  spentLabel: {
    fontSize: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spentAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  breakdownSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  toggleButtonActive: {
    backgroundColor: '#2563EB',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  categoriesList: {
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});

