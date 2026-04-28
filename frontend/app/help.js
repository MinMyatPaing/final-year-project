import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import '../global.css';

const FAQ = [
  { q: 'How do I add my transactions?', a: 'Upload a PDF bank statement from the home screen using the Upload button. The AI will extract and categorise your transactions automatically.' },
  { q: 'How does the AI chat work?', a: 'Tap the AI Chat tab to ask questions about your spending, get budgeting tips, or analyse your financial habits. Your transaction history gives the AI helpful context.' },
  { q: 'Is my data secure?', a: 'All data is stored securely in an encrypted MongoDB database. Passwords are hashed and all API requests require a valid JWT token.' },
  { q: 'How do categories work?', a: 'Categories are automatically assigned when your bank statement is processed. You can also re-categorise transactions manually.' },
  { q: 'Why are some amounts negative?', a: 'Negative amounts represent money you spent (outgoing). Positive amounts are income or money received.' },
];

export default function HelpCentre() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Help Centre</Text>
      </View>
      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
        <View className="bg-indigo-50 rounded-2xl p-4 mb-5 flex-row items-center">
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#4f46e5" />
          <View className="ml-3 flex-1">
            <Text className="text-indigo-800 font-bold text-base">Need more help?</Text>
            <Text className="text-indigo-500 text-sm">Ask the AI assistant on the Chat tab</Text>
          </View>
        </View>
        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">Frequently Asked Questions</Text>
        {FAQ.map((item, i) => (
          <View key={i} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
            <Text className="text-slate-800 font-semibold text-sm mb-1">{item.q}</Text>
            <Text className="text-slate-500 text-sm leading-5">{item.a}</Text>
          </View>
        ))}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-slate-800 font-semibold text-sm mb-1">Contact Support</Text>
          <Text className="text-slate-500 text-sm leading-5">
            For further assistance, email us at{' '}
            <Text className="text-indigo-600">support@pocketwise.app</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
