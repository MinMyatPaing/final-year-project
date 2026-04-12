import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LogoutButton({ onPress }) {
  return (
    <View className="mx-4 mb-10">
      <TouchableOpacity
        className="bg-rose-50 border border-rose-100 rounded-2xl py-4 flex-row items-center justify-center"
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
        <Text className="text-rose-500 text-base font-semibold ml-2">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
