import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { mockUser } from '@/data/mockData';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconSymbolName =
  | 'person.fill'
  | 'creditcard.fill'
  | 'bell.fill'
  | 'lock.fill'
  | 'doc.text.fill'
  | 'questionmark.circle.fill'
  | 'gear'
  | 'chevron.right'
  | 'person.circle.fill';

interface MenuItem {
  icon: IconSymbolName;
  label: string;
  action: () => void;
}

export default function ProfileScreen() {
  const menuItems: MenuItem[] = [
    { icon: 'person.fill', label: 'Personal Information', action: () => {} },
    { icon: 'creditcard.fill', label: 'Cards & Accounts', action: () => {} },
    { icon: 'bell.fill', label: 'Notifications', action: () => {} },
    { icon: 'lock.fill', label: 'Security & Privacy', action: () => {} },
    { icon: 'doc.text.fill', label: 'Statements & Reports', action: () => {} },
    { icon: 'questionmark.circle.fill', label: 'Help & Support', action: () => {} },
    { icon: 'gear', label: 'Settings', action: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Profile
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.profileSection}>
          <ThemedView style={styles.avatarContainer}>
            <IconSymbol name="person.circle.fill" size={80} color="#2563EB" />
          </ThemedView>
          <ThemedText type="defaultSemiBold" style={styles.userName}>
            {mockUser.name}
          </ThemedText>
          <ThemedText style={styles.userEmail} lightColor="#666" darkColor="#999">
            {mockUser.email}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={item.action}
              activeOpacity={0.7}>
              <ThemedView style={styles.menuItem}>
                <ThemedView style={styles.menuItemLeft}>
                  <IconSymbol
                    name={item.icon}
                    size={22}
                    color="#2563EB"
                  />
                  <ThemedText style={styles.menuItemLabel}>{item.label}</ThemedText>
                </ThemedView>
                <IconSymbol name="chevron.right" size={18} color="#9CA3AF" />
              </ThemedView>
            </TouchableOpacity>
          ))}
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedText style={styles.footerText} lightColor="#999" darkColor="#666">
            App Version 1.0.0
          </ThemedText>
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  menuSection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 12,
  },
});

