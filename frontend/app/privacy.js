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
    body: 'We collect your name, email address, university details, financial goals (monthly income and spending goal), and the transaction data extracted from the bank statements you upload. No bank login credentials are ever requested or stored.',
  },
  {
    title: 'How Bank Statements Are Processed',
    icon: 'document-text-outline',
    color: '#06b6d4',
    body: 'When you upload a bank statement PDF, it is converted into page images in memory on our server. These images are then sent to the Anthropic Claude API for transaction extraction. The original PDF and all page images are discarded immediately afterwards — they are never written to permanent storage.',
  },
  {
    title: 'AI & Third-Party Services',
    icon: 'chatbubble-ellipses-outline',
    color: '#f59e0b',
    body: 'PocketWise uses the following third-party AI services (only when you have given consent):\n\n• Anthropic Claude — bank statement page images are sent for transaction extraction; transaction descriptions are sent for categorisation and report generation; your spending context is sent for AI chat responses.\n\n• Pinecone — your transactions are stored as semantic vector embeddings to power the AI chat assistant\'s memory of your spending history.\n\n• OpenAI — used only to generate the numerical embeddings stored in Pinecone; your text is not used for model training.\n\nAnthropic\'s enterprise API does not use customer data to train its models. You can withdraw your AI consent at any time in Profile → Settings.',
  },
  {
    title: 'Data Storage & Security',
    icon: 'shield-checkmark-outline',
    color: '#10b981',
    body: 'Your account and transaction data is stored in MongoDB Atlas, which encrypts data at rest using AES-256. Passwords are never stored in plain text — they are hashed using bcrypt before saving. Your login token is stored in your device\'s hardware-backed secure keychain (iOS Keychain / Android Keystore), not in plain app storage. Transaction embeddings are stored in Pinecone, which also encrypts data at rest. All communication between the app and our servers uses HTTPS/TLS.',
  },
  {
    title: 'Your Rights & Data Deletion',
    icon: 'person-circle-outline',
    color: '#8b5cf6',
    body: 'You have the right to delete your account and all associated data at any time. To do so, go to Profile → Delete Account. This will permanently remove your account from our database, all your transaction records, and all your vector embeddings from Pinecone. Deletion is immediate and irreversible. You also have the right to withdraw AI personalisation consent at any time from your profile settings, without deleting your account.',
  },
  {
    title: 'No Advertising or Tracking',
    icon: 'eye-off-outline',
    color: '#ec4899',
    body: 'PocketWise does not use advertising networks, third-party analytics trackers, or behavioural profiling. We do not sell your data. Your financial data is used solely to provide the features of this app to you.',
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
            <Text className="text-indigo-500 text-sm">Last updated: April 2026</Text>
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
            Privacy enquiries:{' '}
            <Text className="text-indigo-600">privacy@pocketwise.app</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
