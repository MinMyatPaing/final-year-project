import { View, ScrollView, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../../store/authSlice';
import apiClient from '../../../api/client';
import '../../../global.css';

import ProfileHeader from '../../../components/profile/ProfileHeader';
import StatsCard from '../../../components/profile/StatsCard';
import MenuSection from '../../../components/profile/MenuSection';
import LogoutButton from '../../../components/profile/LogoutButton';

export default function Profile() {
  // BUG FIX: transactions live in state.transaction, NOT state.auth
  const { user } = useSelector((state) => state.auth);
  const { transactions } = useSelector((state) => state.transaction);
  const dispatch = useDispatch();

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const totalSpent = (transactions || [])
    .filter((t) => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const txCount   = (transactions || []).length;
  const categories = new Set((transactions || []).map((t) => t.category)).size;

  // ─── Logout with confirmation ─────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/api/auth/logout');
            } catch (_) {
              // ignore network errors — local logout still proceeds
            }
            dispatch(logoutUser());
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    // Outer View is indigo so the status-bar / notch area matches the header
    <View style={{ flex: 1, backgroundColor: '#4f46e5' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

        <ScrollView showsVerticalScrollIndicator={false}>
          <ProfileHeader
            displayName={displayName}
            initials={initials}
            email={user?.email}
          />

          <View className="bg-slate-50 rounded-t-3xl">
            <StatsCard
              txCount={txCount}
              totalSpent={totalSpent}
              categories={categories}
            />

            <MenuSection />

            <LogoutButton onPress={handleLogout} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
