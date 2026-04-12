import { useState, useEffect } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "expo-router";
import UploadModal from "../../../components/UploadModal";
import { fetchTransactions } from "../../../store/transactionSlice";
import "../../../global.css";

import HomeHeader from "../../../components/home/HomeHeader";
import QuickActions from "../../../components/home/QuickActions";
import SpendingOverview from "../../../components/home/SpendingOverview";
import RecentTransactions from "../../../components/home/RecentTransactions";

export default function Home() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const { transactions } = useSelector((state) => state.transaction);
  const [uploadVisible, setUploadVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchTransactions());
  }, []);

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
          onUploadSuccess={() => setUploadVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}
