import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatInput({ inputText, setInputText, isTyping, onSend }) {
  return (
    <View className="bg-white border-t border-slate-100 px-4 py-3">
      <View className="flex-row items-end bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
        <TextInput
          className="flex-1 text-slate-800 text-sm"
          style={{ maxHeight: 96 }}
          placeholder={isTyping ? 'AI is responding…' : 'Ask about your finances…'}
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!isTyping}
          onSubmitEditing={() => onSend()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: inputText.trim() && !isTyping ? '#6366f1' : '#e2e8f0',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 8,
          }}
          onPress={() => onSend()}
          disabled={!inputText.trim() || isTyping}
          activeOpacity={0.8}
        >
          <Ionicons
            name="send"
            size={14}
            color={inputText.trim() && !isTyping ? 'white' : '#94a3b8'}
          />
        </TouchableOpacity>
      </View>
      <Text className="text-slate-300 text-xs text-center mt-1.5">
        Powered by GPT-4o · Responses may not be 100% accurate
      </Text>
    </View>
  );
}
