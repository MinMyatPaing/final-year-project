import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HeroSection() {
  const router = useRouter();

  return (
    <View className="bg-indigo-600 px-6 pt-12 pb-16 rounded-b-3xl">
      <TouchableOpacity
        className="flex-row items-center mb-6"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
        <Text className="text-white text-sm ml-2">Back to Sign In</Text>
      </TouchableOpacity>
      <View className="items-center">
        <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mb-4">
          <Ionicons name="wallet" size={32} color="white" />
        </View>
        <Text className="text-white text-3xl font-bold tracking-tight">PocketWise</Text>
        <Text className="text-indigo-200 text-sm mt-1">Smart finance for students</Text>
      </View>
    </View>
  );
}
