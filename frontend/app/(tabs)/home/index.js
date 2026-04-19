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

  // ── Single source of truth for the selected month ────────────────────────
  // Both HomeHeader (controlled) and SpendingOverview read from here.
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  // Fetch transactions once we have a token
  useEffect(() => {
    if (!token) return;
    dispatch(fetchTransactions()).then((result) => {
      if (Array.isArray(result.payload)) {
        checkBudgetAlerts(result.payload);
      }
    });
  }, [token]);

  const allTxns = transactions || [];
  const recentTxns = allTxns.slice(0, 5);

  const handleQuickAction = (key) => {
    if (key === "upload") setUploadVisible(true);
    if (key === "add") router.push("/add-expense");
    if (key === "budget") router.push("/budget");
    if (key === "reports") router.push("/reports");
  };

  /**
   * After the upload is confirmed:
   *  1. Re-fetch so Redux (and therefore every component on this screen) gets
   *     the freshly-saved transactions.
   *  2. Auto-navigate the month picker to the month of the most-recent
   *     uploaded transaction so the user immediately sees their data.
   */
  const handleUploadSuccess = (savedPayload) => {
    setUploadVisible(false);

    dispatch(fetchTransactions()).then((result) => {
      if (Array.isArray(result.payload)) {
        checkBudgetAlerts(result.payload);
      }
    });

    // Navigate to the month of the most recent uploaded transaction
    if (savedPayload?.length > 0) {
      const validDates = savedPayload
        .map((t) => new Date(t.date))
        .filter((d) => !isNaN(d.getTime()));

      if (validDates.length > 0) {
        const latest = new Date(Math.max(...validDates.map((d) => d.getTime())));
        setSelectedYear(latest.getFullYear());
        setSelectedMonth(latest.getMonth());
      }
    }
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
          {/*
           * HomeHeader is now fully controlled:
           *  - receives selectedYear / selectedMonth as props
           *  - calls onMonthChange when the user taps the arrows
           */}
          <HomeHeader
            user={user}
            transactions={allTxns}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
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

            {/* SpendingOverview uses the same controlled month */}
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
          onUploadSuccess={handleUploadSuccess}
        />
      </SafeAreaView>
    </View>
  );
}
