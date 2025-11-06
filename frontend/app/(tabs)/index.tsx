import { StyleSheet, ScrollView, TextInput, View } from 'react-native';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { TransactionItem } from '@/components/budgeting/TransactionItem';
import { mockTransactions } from '@/data/mockData';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [budget, setBudget] = useState<string>('');
  const recentTransactions = mockTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const isDark = colorScheme === 'dark';
  const inputBackground = isDark ? '#1E293B' : '#F3F4F6';
  const inputTextColor = isDark ? '#ECEDEE' : '#11181C';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Budget Tracker
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.budgetSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Monthly Budget
          </ThemedText>
          <View style={[styles.inputContainer, { backgroundColor: inputBackground }]}>
            <ThemedText style={styles.currencyLabel}>£</ThemedText>
            <TextInput
              style={[styles.input, { color: inputTextColor }]}
              placeholder="Enter your budget"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
          </View>
          <ThemedText style={styles.inputHint} lightColor="#666" darkColor="#999">
            Enter your monthly budget to track your spending
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recent Transactions
          </ThemedText>
          <ThemedView style={styles.transactionsList}>
            {recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
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
  budgetSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  inputHint: {
    fontSize: 12,
  },
  section: {
    marginTop: 8,
  },
  transactionsList: {
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
});
