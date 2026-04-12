import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatHeader({ onClear }) {
  return (
    <View className="bg-indigo-600 px-5 pt-4 pb-5">
      <View className="flex-row items-center">
        <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
          <Ionicons name="sparkles" size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-bold">AI Finance Assistant</Text>
          <View className="flex-row items-center mt-0.5">
            <View className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5" />
            <Text className="text-indigo-200 text-xs">GPT-4o · Web Search Enabled</Text>
          </View>
        </View>
        <TouchableOpacity
          className="w-9 h-9 bg-white/15 rounded-full items-center justify-center"
          onPress={onClear}
        >
          <Ionicons name="refresh-outline" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
