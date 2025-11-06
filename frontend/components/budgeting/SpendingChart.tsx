import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { MonthlySpending } from '@/types/budgeting';

interface SpendingChartProps {
  monthlyData: MonthlySpending[];
}

export function SpendingChart({ monthlyData }: SpendingChartProps) {
  const maxAmount = Math.max(...monthlyData.map((m) => m.amount), 100);
  const chartHeight = 120;
  const yAxisLabels = [maxAmount, maxAmount / 2, 0];
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Y-axis labels on the left */}
        <View style={styles.yAxisContainer}>
          {yAxisLabels.map((value, index) => (
            <ThemedText
              key={index}
              style={styles.yAxisLabel}
              lightColor="#999"
              darkColor="#666">
              £{Math.round(value)}
            </ThemedText>
          ))}
        </View>
        
        {/* Chart area with bars */}
        <View style={styles.chartArea}>
          <View style={styles.barsContainer}>
            {monthlyData.map((month, index) => {
              const barHeight = (month.amount / maxAmount) * chartHeight;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(barHeight, 2) },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          
          {/* Month labels below bars */}
          <View style={styles.monthLabelsContainer}>
            {monthlyData.map((month, index) => (
              <ThemedText
                key={index}
                style={styles.monthLabel}
                lightColor="#666"
                darkColor="#999">
                {month.month}
              </ThemedText>
            ))}
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 160,
    paddingHorizontal: 8,
  },
  yAxisContainer: {
    width: 50,
    justifyContent: 'space-between',
    paddingBottom: 30,
    paddingTop: 0,
  },
  yAxisLabel: {
    fontSize: 10,
    height: 40,
    textAlign: 'right',
  },
  chartArea: {
    flex: 1,
    paddingLeft: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 30,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barContainer: {
    width: '80%',
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    backgroundColor: '#14B8A6', // Teal color
    borderRadius: 4,
    minHeight: 2,
  },
  monthLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    height: 30,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 10,
    flex: 1,
    textAlign: 'center',
  },
});

