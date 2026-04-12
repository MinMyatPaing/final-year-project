import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileHeader({ displayName, initials, email }) {
  return (
    <View className="px-5 pt-4 pb-16">
      <Text className="text-white text-xl font-bold mb-6">Profile</Text>
      <View className="items-center">
        <View className="w-20 h-20 bg-white/25 rounded-full items-center justify-center mb-3 border-4 border-white/30">
          <Text className="text-white text-2xl font-bold">{initials}</Text>
        </View>
        <Text className="text-white text-lg font-bold">{displayName}</Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="school-outline" size={13} color="#a5b4fc" />
          <Text className="text-indigo-200 text-sm ml-1">
            {email || 'student@university.ac.uk'}
          </Text>
        </View>
      </View>
    </View>
  );
}
