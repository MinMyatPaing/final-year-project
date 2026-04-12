import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  error,
  loading,
  onSubmit,
}) {
  const router = useRouter();

  return (
    <View className="mx-4 -mt-6 bg-white rounded-2xl shadow-lg p-6">
      <Text className="text-slate-800 text-xl font-bold mb-1">Create Account 🎓</Text>
      <Text className="text-slate-500 text-sm mb-6">Start tracking your student finances</Text>

      {/* Name Field */}
      <View className="mb-4">
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Full Name
        </Text>
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Ionicons name="person-outline" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base"
            placeholder="John Smith"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />
        </View>
      </View>

      {/* Email Field */}
      <View className="mb-4">
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
          University Email
        </Text>
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Ionicons name="mail-outline" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base"
            placeholder="you@university.ac.uk"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>
      </View>

      {/* Password Field */}
      <View className="mb-4">
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Password
        </Text>
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base"
            placeholder="Min. 6 characters"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password Field */}
      <View className="mb-6">
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Confirm Password
        </Text>
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Ionicons name="shield-checkmark-outline" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base"
            placeholder="Repeat your password"
            placeholderTextColor="#94a3b8"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons
              name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error ? (
        <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
          <Text className="text-rose-500 text-sm ml-2 flex-1">{error}</Text>
        </View>
      ) : null}

      {/* Register Button */}
      <TouchableOpacity
        className="bg-indigo-600 rounded-xl py-4 items-center shadow-sm"
        onPress={onSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-base font-bold">Create Account</Text>
        )}
      </TouchableOpacity>

      {/* Login Link */}
      <TouchableOpacity
        className="items-center mt-5"
        onPress={() => router.push('/login')}
        activeOpacity={0.7}
      >
        <Text className="text-slate-500 text-sm">
          Already have an account?{' '}
          <Text className="text-indigo-600 font-semibold">Sign In</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
