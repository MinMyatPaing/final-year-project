import { View, Text, Dimensions } from 'react-native';
import { PieChart as Chart } from 'react-native-chart-kit';

/**
 * Covers both manually-added categories (add-expense.js) and
 * AI-categorised ones (categorize_agent.py).
 */
const CATEGORY_COLORS = {
  // Manual (add-expense.js)
  Food:             '#6366f1',
  Transport:        '#22d3ee',
  Entertainment:    '#f43f5e',
  Shopping:         '#f59e0b',
  Education:        '#10b981',
  Health:           '#ec4899',
  Housing:          '#8b5cf6',
  // AI agent (categorize_agent.py)
  Transportation:   '#22d3ee',   // same hue as Transport
  'Eat Out':        '#818cf8',
  Groceries:        '#a78bfa',
  'Bills & Utilities': '#8b5cf6',
  Healthcare:       '#ec4899',
  'Personal Care':  '#14b8a6',
  Other:            '#94a3b8',
};

function buildChartData(transactions) {
  // Only include expense transactions (amount < 0)
  const expenses = (transactions || []).filter(
    (t) => parseFloat(t.amount) < 0
  );
  if (expenses.length === 0) return [];

  const totals = {};
  expenses.forEach((t) => {
    const cat = t.category || 'Other';
    totals[cat] = (totals[cat] || 0) + Math.abs(parseFloat(t.amount) || 0);
  });

  return Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .map(([name, amount]) => ({
      name,
      amount: parseFloat(amount.toFixed(2)),
      color: CATEGORY_COLORS[name] ?? CATEGORY_COLORS.Other,
    }));
}

export default function PieChart({ transactions }) {
  const chartData = buildChartData(transactions);
  const screenWidth = Dimensions.get('window').width;
  const total = chartData.reduce((sum, d) => sum + d.amount, 0);

  // ── Empty state — no expenses yet ─────────────────────────────────────────
  if (chartData.length === 0) {
    return (
      <View className="items-center py-8">
        <Text style={{ fontSize: 36 }}>📊</Text>
        <Text className="text-slate-500 text-sm font-medium mt-2">No spending data yet</Text>
        <Text className="text-slate-400 text-xs mt-1 text-center px-4">
          Upload a bank statement or add an expense to see your spending breakdown.
        </Text>
      </View>
    );
  }

  const formattedData = chartData.map((d) => ({
    name: d.name,
    population: d.amount,
    color: d.color,
    legendFontColor: '#475569',
    legendFontSize: 12,
  }));

  return (
    <View>
      {/* Chart */}
      <Chart
        data={formattedData}
        width={screenWidth - 32}
        height={200}
        chartConfig={{
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          labelColor: () => '#475569',
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="10"
        center={[10, 0]}
        hasLegend={false}
        absolute
      />

      {/* Custom Legend */}
      <View className="flex-row flex-wrap justify-center gap-y-2 mt-2 px-2">
        {chartData.map((item) => {
          const pct = total > 0 ? ((item.amount / total) * 100).toFixed(0) : 0;
          return (
            <View key={item.name} className="flex-row items-center mr-4 mb-1">
              <View
                style={{ backgroundColor: item.color }}
                className="w-2.5 h-2.5 rounded-full mr-1.5"
              />
              <Text className="text-slate-600 text-xs">
                {item.name}{' '}
                <Text className="text-slate-400">({pct}%)</Text>
              </Text>
            </View>
          );
        })}
      </View>

      {/* Total */}
      <View className="items-center mt-3">
        <Text className="text-slate-400 text-xs">Total Spending</Text>
        <Text className="text-slate-800 text-lg font-bold">£{total.toFixed(2)}</Text>
      </View>
    </View>
  );
}
