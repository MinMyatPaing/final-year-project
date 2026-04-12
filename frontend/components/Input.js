import { View, TextInput, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Input({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  label,
  icon,
  error,
}) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-slate-600 text-xs font-semibold uppercase tracking-wide mb-2">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center bg-slate-50 border rounded-xl px-4 py-3 ${
          error ? 'border-rose-300' : 'border-slate-200'
        }`}
      >
        {icon && <Ionicons name={icon} size={18} color="#94a3b8" />}
        <TextInput
          className={`flex-1 text-slate-800 text-base ${icon ? 'ml-3' : ''}`}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'none'}
          autoComplete={autoComplete}
        />
      </View>
      {error && <Text className="text-rose-500 text-xs mt-1 ml-1">{error}</Text>}
    </View>
  );
}
