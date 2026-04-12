import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

export default function Button({ title, onPress, loading = false, variant = 'primary', disabled = false }) {
  const isOutline = variant === 'outline';
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      className={`rounded-xl py-4 items-center mb-3 ${
        isOutline
          ? 'border border-indigo-200 bg-white'
          : isDisabled
          ? 'bg-indigo-300'
          : 'bg-indigo-600'
      }`}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? '#6366f1' : 'white'} />
      ) : (
        <Text
          className={`text-base font-bold ${
            isOutline ? 'text-indigo-600' : 'text-white'
          }`}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
