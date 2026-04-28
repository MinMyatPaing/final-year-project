import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import '../global.css';

export default function About() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">About</Text>
      </View>
      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
        {/* App logo card */}
        <View className="bg-indigo-600 rounded-2xl p-6 items-center mb-5">
          <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mb-3">
            <Ionicons name="wallet" size={32} color="white" />
          </View>
          <Text className="text-white text-2xl font-bold">PocketWise</Text>
          <Text className="text-indigo-200 text-sm mt-1">Version 1.0.0</Text>
        </View>
        {/* Description */}
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-slate-800 font-bold text-sm mb-2">What is PocketWise?</Text>
          <Text className="text-slate-500 text-sm leading-5">
            PocketWise is a smart personal finance app designed specifically for university students. It helps you track spending, understand your financial habits, and get AI-powered budgeting advice — all in one place.
          </Text>
        </View>
        {/* Features */}
        <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <Text className="text-slate-800 font-bold text-sm mb-3">Key Features</Text>
          {[
            { icon: 'document-text-outline', text: 'Upload bank statements as PDFs' },
            { icon: 'pie-chart-outline', text: 'Visual spending breakdowns' },
            { icon: 'chatbubble-ellipses-outline', text: 'AI-powered financial assistant' },
            { icon: 'shield-checkmark-outline', text: 'Secure encrypted storage' },
          ].map((f, i) => (
            <View key={i} className="flex-row items-center mb-2">
              <Ionicons name={f.icon} size={18} color="#6366f1" />
              <Text className="text-slate-600 text-sm ml-2">{f.text}</Text>
            </View>
          ))}
        </View>
        {/* Built by */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-slate-800 font-bold text-sm mb-1">Built by</Text>
          <Text className="text-slate-500 text-sm leading-5">
            Developed as a Final Year Project at the University of Huddersfield.{'\n'}
            Stack: React Native · Expo · Node.js · MongoDB · LangGraph · GPT-4o
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
