import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import apiClient from '../api/client';
import '../global.css';

// ─── Month helpers ────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toYYYYMM(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function Reports() {
  const router = useRouter();
  const { transactions } = useSelector((s) => s.transaction);
  const { user } = useSelector((s) => s.auth);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const goToPrev = () => {
    if (selectedMonth === 0) { setSelectedYear((y) => y - 1); setSelectedMonth(11); }
    else setSelectedMonth((m) => m - 1);
    setReport(null); setError('');
  };
  const goToNext = () => {
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedYear((y) => y + 1); setSelectedMonth(0); }
    else setSelectedMonth((m) => m + 1);
    setReport(null); setError('');
  };

  // Filter transactions to selected month
  const monthTxns = useMemo(() => (transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  }), [transactions, selectedYear, selectedMonth]);

  const totalIn = monthTxns.filter((t) => parseFloat(t.amount) > 0)
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalOut = monthTxns.filter((t) => parseFloat(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);

  // ── Generate report ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (monthTxns.length === 0) {
      setError('No transactions found for this month. Upload a bank statement first.');
      return;
    }
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await apiClient.post('/api/report', {
        month: toYYYYMM(selectedYear, selectedMonth),
        transactions: monthTxns,
        user,
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // ── Export as PDF ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!report?.html) return;
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: report.html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `PocketWise Report — ${MONTHS[selectedMonth]} ${selectedYear}`,
        });
      } else {
        Alert.alert('Saved', `PDF saved to: ${uri}`);
      }
    } catch (err) {
      Alert.alert('Export failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const net = totalIn - totalOut;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-800">Financial Reports</Text>
          <Text className="text-slate-400 text-xs">AI-powered monthly analysis</Text>
        </View>
        {report && (
          <TouchableOpacity
            onPress={handleExport}
            disabled={exporting}
            className="flex-row items-center bg-indigo-600 px-3 py-2 rounded-xl"
          >
            {exporting
              ? <ActivityIndicator size="small" color="white" />
              : <Ionicons name="download-outline" size={16} color="white" />}
            <Text className="text-white text-xs font-semibold ml-1">PDF</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
        {/* Month selector */}
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
            Select Month
          </Text>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={goToPrev} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center">
              <Ionicons name="chevron-back" size={18} color="#4f46e5" />
            </TouchableOpacity>
            <Text className="text-slate-800 font-bold text-base">
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity
              onPress={goToNext}
              disabled={isCurrentMonth}
              className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center"
            >
              <Ionicons name="chevron-forward" size={18} color={isCurrentMonth ? '#cbd5e1' : '#4f46e5'} />
            </TouchableOpacity>
          </View>

          {/* Quick stats */}
          <View className="flex-row mt-4 gap-2">
            <View className="flex-1 bg-emerald-50 rounded-xl p-3 items-center">
              <Text className="text-emerald-600 text-xs">Income</Text>
              <Text className="text-emerald-700 font-bold text-sm mt-0.5">£{totalIn.toFixed(2)}</Text>
            </View>
            <View className="flex-1 bg-rose-50 rounded-xl p-3 items-center">
              <Text className="text-rose-500 text-xs">Expenses</Text>
              <Text className="text-rose-600 font-bold text-sm mt-0.5">£{totalOut.toFixed(2)}</Text>
            </View>
            <View className={`flex-1 rounded-xl p-3 items-center ${net >= 0 ? 'bg-indigo-50' : 'bg-amber-50'}`}>
              <Text className={`text-xs ${net >= 0 ? 'text-indigo-500' : 'text-amber-600'}`}>Net</Text>
              <Text className={`font-bold text-sm mt-0.5 ${net >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
                {net >= 0 ? '+' : ''}£{net.toFixed(2)}
              </Text>
            </View>
          </View>

          <Text className="text-slate-400 text-xs text-center mt-3">
            {monthTxns.length} transaction{monthTxns.length !== 1 ? 's' : ''} this month
          </Text>
        </View>

        {/* Generate button */}
        {!report && !loading && (
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={monthTxns.length === 0}
            className={`rounded-2xl py-4 items-center mb-4 flex-row justify-center ${
              monthTxns.length === 0 ? 'bg-slate-200' : 'bg-indigo-600'
            }`}
          >
            <Ionicons name="sparkles-outline" size={18} color={monthTxns.length === 0 ? '#94a3b8' : 'white'} />
            <Text className={`font-bold text-base ml-2 ${monthTxns.length === 0 ? 'text-slate-400' : 'text-white'}`}>
              Generate AI Report
            </Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {loading && (
          <View className="bg-white rounded-2xl p-8 items-center mb-4">
            <ActivityIndicator size="large" color="#6366f1" />
            <Text className="text-slate-500 text-sm mt-3">Analysing your finances…</Text>
            <Text className="text-slate-400 text-xs mt-1">This takes about 10 seconds</Text>
          </View>
        )}

        {/* Error */}
        {error ? (
          <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
            <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
            <Text className="text-rose-500 text-xs ml-2 flex-1">{error}</Text>
          </View>
        ) : null}

        {/* Report */}
        {report && (
          <>
            {/* Summary */}
            <View className="bg-indigo-600 rounded-2xl p-5 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text-outline" size={18} color="white" />
                <Text className="text-white font-bold text-sm ml-2">Summary</Text>
              </View>
              <Text className="text-indigo-100 text-sm leading-5">{report.summary}</Text>
            </View>

            {/* Top categories */}
            {report.top_categories?.length > 0 && (
              <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                <Text className="text-slate-800 font-bold text-sm mb-3">Top Spending Categories</Text>
                {report.top_categories.map((c, i) => (
                  <View key={i} className="flex-row items-center justify-between py-2 border-b border-slate-50">
                    <Text className="text-slate-600 text-sm">{c.category}</Text>
                    <Text className="text-rose-500 font-semibold text-sm">£{c.amount.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Insights */}
            {report.insights?.length > 0 && (
              <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
                  <Text className="text-slate-800 font-bold text-sm ml-2">Insights</Text>
                </View>
                {report.insights.map((insight, i) => (
                  <View key={i} className="flex-row mb-2.5">
                    <Text className="text-amber-500 mr-2 mt-0.5">•</Text>
                    <Text className="text-slate-600 text-sm leading-5 flex-1">{insight}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {report.recommendations?.length > 0 && (
              <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                  <Text className="text-slate-800 font-bold text-sm ml-2">Recommendations</Text>
                </View>
                {report.recommendations.map((rec, i) => (
                  <View key={i} className="flex-row mb-2.5">
                    <Text className="text-emerald-500 mr-2 mt-0.5">✓</Text>
                    <Text className="text-slate-600 text-sm leading-5 flex-1">{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Export button (bottom) */}
            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              className="bg-indigo-600 rounded-2xl py-4 items-center flex-row justify-center mb-8"
            >
              {exporting
                ? <ActivityIndicator size="small" color="white" />
                : <Ionicons name="download-outline" size={18} color="white" />}
              <Text className="text-white font-bold text-base ml-2">
                {exporting ? 'Exporting…' : 'Download PDF Report'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
