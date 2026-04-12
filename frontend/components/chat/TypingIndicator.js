import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TypingIndicator() {
  return (
    <View className="mb-3 px-4 items-start">
      <View className="flex-row items-center mb-1">
        <View className="w-6 h-6 bg-indigo-100 rounded-full items-center justify-center mr-1.5">
          <Ionicons name="sparkles" size={12} color="#6366f1" />
        </View>
        <Text className="text-slate-400 text-xs font-medium">AI is thinking…</Text>
      </View>
      <View className="bg-white shadow-sm border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <View className="w-2 h-2 bg-indigo-300 rounded-full" />
          <View className="w-2 h-2 bg-indigo-400 rounded-full" />
          <View className="w-2 h-2 bg-indigo-500 rounded-full" />
        </View>
      </View>
    </View>
  );
}
