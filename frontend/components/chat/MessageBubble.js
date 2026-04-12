import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      {!isUser && (
        <View className="flex-row items-center mb-1">
          <View
            className={`w-6 h-6 rounded-full items-center justify-center mr-1.5 ${
              isError ? 'bg-rose-100' : 'bg-indigo-100'
            }`}
          >
            <Ionicons
              name={isError ? 'warning-outline' : 'sparkles'}
              size={12}
              color={isError ? '#f43f5e' : '#6366f1'}
            />
          </View>
          <Text className="text-slate-400 text-xs font-medium">
            {isError ? 'Error' : 'AI Assistant'}
          </Text>
        </View>
      )}
      <View
        className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 rounded-tr-sm max-w-xs'
            : isError
            ? 'bg-rose-50 border border-rose-200 rounded-tl-sm max-w-xs'
            : 'bg-white shadow-sm border border-slate-100 rounded-tl-sm'
        }`}
        style={isUser || isError ? {} : { maxWidth: '85%' }}
      >
        <Text
          className={`text-sm leading-5 ${
            isUser ? 'text-white' : isError ? 'text-rose-600' : 'text-slate-700'
          }`}
        >
          {message.text}
        </Text>
      </View>
      <Text className="text-slate-300 text-xs mt-1">{message.time}</Text>
    </View>
  );
}
