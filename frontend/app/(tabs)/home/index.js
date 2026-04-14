import { useState, useEffect } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import UploadModal from "../../../components/UploadModal";
import { fetchTransactions } from "../../../store/transactionSlice";
import { checkBudgetAlerts } from "../../../utils/budgetNotifications";
import "../../../global.css";

import HomeHeader from "../../../components/home/HomeHeader";
import QuickActions from "../../../components/home/QuickActions";
import SpendingOverview from "../../../components/home/SpendingOverview";
import RecentTransactions from "../../../components/home/RecentTransactions";

export default function Home() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, token } = useSelector((state) => state.auth);
  const { transactions } = useSelector((state) => state.transaction);
  const [uploadVisible, setUploadVisible] = useState(false);

  // ── Selected month — lifted here so SpendingOverview stays in sync ──────────
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  // Depend on `token` so we only fetch once the auth token is actually available.
  // After fetching, check budget thresholds and fire local push notifications.
  useEffect(() => {
    if (!token) return;
    dispatch(fetchTransactions()).then((result) => {
      if (Array.isArray(result.payload)) {
        checkBudgetAlerts(result.payload);
      }
    });
  }, [token]);

  const allTxns = transactions || [];

  // Recent transactions (last 5 across all time)
  const recentTxns = allTxns.slice(0, 5);

  const handleQuickAction = (key) => {
    if (key === "upload") setUploadVisible(true);
    if (key === "add") router.push("/add-expense");
    if (key === "budget") router.push("/budget");
    if (key === "reports") router.push("/reports");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#4f46e5" }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: "#4f46e5" }}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* HomeHeader owns the month picker UI and notifies us of changes */}
          <HomeHeader
            user={user}
            transactions={allTxns}
            onMonthChange={(year, month) => {
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
          />

          <View
            className="bg-slate-50 rounded-t-3xl"
            style={{ minHeight: 600 }}
          >
            <QuickActions onAction={handleQuickAction} />

            {/* SpendingOverview receives the selected month from state */}
            <SpendingOverview
              transactions={allTxns}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
            />

            <RecentTransactions transactions={recentTxns} />
          </View>
        </ScrollView>

        <UploadModal
          visible={uploadVisible}
          onClose={() => setUploadVisible(false)}
          onUploadSuccess={() => {
            setUploadVisible(false);
            // Re-fetch and re-check budget after a successful upload
            dispatch(fetchTransactions()).then((result) => {
              if (Array.isArray(result.payload)) {
                checkBudgetAlerts(result.payload);
              }
            });
          }}
        />
      </SafeAreaView>
    </View>
  );
}
