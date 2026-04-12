import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const showNotificationAlert = () =>
  Alert.alert(
    '🔔 Enable Notifications',
    "Get notified when you're about to exceed your planned budget. Stay on track with smart spending alerts.",
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Enable', onPress: () => {} },
    ]
  );

export const MENU_SECTIONS = [
  {
    title: 'Finance',
    items: [
      { label: 'Budget Settings', icon: 'wallet-outline', color: '#6366f1', bg: '#eef2ff', route: null },
      { label: 'Export Reports', icon: 'download-outline', color: '#10b981', bg: '#ecfdf5', route: null },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Edit Profile', icon: 'person-outline', color: '#f59e0b', bg: '#fffbeb', route: '/edit-profile' },
      { label: 'Notifications', icon: 'notifications-outline', color: '#8b5cf6', bg: '#f5f3ff', route: '__notifications__' },
      { label: 'Privacy & Security', icon: 'shield-outline', color: '#ec4899', bg: '#fdf2f8', route: '/privacy' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help Centre', icon: 'help-circle-outline', color: '#6366f1', bg: '#eef2ff', route: '/help' },
      { label: 'About', icon: 'information-circle-outline', color: '#06b6d4', bg: '#ecfeff', route: '/about' },
    ],
  },
];

function MenuItem({ item, onPress }) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-4 py-3.5 bg-white"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={{ backgroundColor: item.bg }}
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
      >
        <Ionicons name={item.icon} size={18} color={item.color} />
      </View>
      <Text className="flex-1 text-slate-700 text-sm font-medium">{item.label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );
}

export default function MenuSection() {
  const router = useRouter();

  return (
    <>
      {MENU_SECTIONS.map((section) => (
        <View key={section.title} className="mx-4 mb-4">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2 px-1">
            {section.title}
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {section.items.map((item, idx) => (
              <View key={item.label}>
                <MenuItem
                  item={item}
                  onPress={
                    item.route === '__notifications__'
                      ? showNotificationAlert
                      : item.route
                      ? () => router.push(item.route)
                      : undefined
                  }
                />
                {idx < section.items.length - 1 && (
                  <View className="h-px bg-slate-50 ml-16" />
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}
