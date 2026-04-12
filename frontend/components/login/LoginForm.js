import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
}) {
  const router = useRouter();

  return (
    <View className="mx-4 -mt-6 bg-white rounded-2xl shadow-lg p-6">
      <Text className="text-slate-800 text-xl font-bold mb-1">Welcome back 👋</Text>
      <Text className="text-slate-500 text-sm mb-6">Sign in to your account</Text>

      {/* Email Field */}
      <View className="mb-4">
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Email Address
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
      <View className="mb-6">
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
          Password
        </Text>
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-3 text-slate-800 text-base"
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
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

      {/* Error Message */}
      {error ? (
        <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
          <Text className="text-rose-500 text-sm ml-2 flex-1">{error}</Text>
        </View>
      ) : null}

      {/* Login Button */}
      <TouchableOpacity
        className="bg-indigo-600 rounded-xl py-4 items-center shadow-sm"
        onPress={onSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-base font-bold">Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View className="flex-row items-center my-5">
        <View className="flex-1 h-px bg-slate-200" />
        <Text className="text-slate-400 text-xs mx-3">OR</Text>
        <View className="flex-1 h-px bg-slate-200" />
      </View>

      {/* Register Link */}
      <TouchableOpacity
        className="border border-indigo-200 rounded-xl py-4 items-center"
        onPress={() => router.push('/register')}
        activeOpacity={0.8}
      >
        <Text className="text-indigo-600 text-base font-semibold">Create an Account</Text>
      </TouchableOpacity>
    </View>
  );
}
