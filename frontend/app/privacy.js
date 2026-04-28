import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import '../global.css';

const SECTIONS = [
  {
    title: 'Data We Collect',
    icon: 'server-outline',
    color: '#6366f1',
    body: 'We collect your name, email address, and financial transaction data that you upload via bank statements. No bank login credentials are ever stored.',
  },
  {
    title: 'How We Use Your Data',
    icon: 'analytics-outline',
    color: '#06b6d4',
    body: 'Your transaction data is used solely to power spending insights and AI-assisted budgeting advice within the app. We do not sell or share your data with third parties.',
  },
  {
    title: 'Data Storage & Security',
    icon: 'shield-checkmark-outline',
    color: '#10b981',
    body: 'All data is stored in an encrypted MongoDB database. Passwords are hashed using bcrypt. API access is protected with signed JWT tokens that expire after 7 days.',
  },
  {
    title: 'AI & Third-Party Services',
    icon: 'chatbubble-ellipses-outline',
    color: '#f59e0b',
    body: 'The AI assistant is powered by OpenAI GPT-4o. When you chat, your message and a summary of your spending context may be sent to OpenAI for processing. Refer to OpenAI\'s privacy policy for details.',
  },
  {
    title: 'Your Rights',
    icon: 'person-circle-outline',
    color: '#8b5cf6',
    body: 'You may request deletion of your account and all associated data at any time by contacting support@pocketwise.app. We will process your request within 30 days.',
  },
  {
    title: 'Cookies & Tracking',
    icon: 'eye-off-outline',
    color: '#ec4899',
    body: 'PocketWise does not use advertising trackers or third-party analytics cookies. Secure tokens are stored locally on your device using the OS keychain.',
  },
];

export default function Privacy() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Privacy & Security</Text>
      </View>

      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
        <View className="bg-indigo-50 rounded-2xl p-4 mb-5 flex-row items-center">
          <Ionicons name="lock-closed-outline" size={28} color="#4f46e5" />
          <View className="ml-3 flex-1">
            <Text className="text-indigo-800 font-bold text-base">Your data, your control</Text>
            <Text className="text-indigo-500 text-sm">Last updated: February 2026</Text>
          </View>
        </View>

        {SECTIONS.map((s, i) => (
          <View key={i} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
            <View className="flex-row items-center mb-2">
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text className="text-slate-800 font-semibold text-sm ml-2">{s.title}</Text>
            </View>
            <Text className="text-slate-500 text-sm leading-5">{s.body}</Text>
          </View>
        ))}

        <View className="bg-white rounded-xl p-4 mb-8 shadow-sm">
          <Text className="text-slate-800 font-semibold text-sm mb-1">Contact Us</Text>
          <Text className="text-slate-500 text-sm leading-5">
            Privacy enquiries: <Text className="text-indigo-600">privacy@pocketwise.app</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
