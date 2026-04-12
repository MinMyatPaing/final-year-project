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
  const totalIncome = allTxns
    .filter((t) => parseFloat(t.amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = allTxns
    .filter((t) => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const recentTxns = allTxns.slice(0, 5);

  const handleQuickAction = (key) => {
    if (key === "upload") setUploadVisible(true);
    if (key === "add") router.push("/add-expense");
    if (key === "budget") router.push("/budget");
    if (key === "reports") router.push("/all-transactions");
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
          <HomeHeader
            user={user}
            totalExpenses={totalExpenses}
            totalIncome={totalIncome}
            txCount={allTxns.length}
          />

          <View
            className="bg-slate-50 rounded-t-3xl"
            style={{ minHeight: 600 }}
          >
            <QuickActions onAction={handleQuickAction} />
            <SpendingOverview transactions={transactions} />
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
