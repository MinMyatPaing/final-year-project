import { useState, useRef } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../../api/client';
import '../../../global.css';

import { INITIAL_MESSAGES } from '../../../components/chat/constants';
import ChatHeader from '../../../components/chat/ChatHeader';
import MessageBubble from '../../../components/chat/MessageBubble';
import TypingIndicator from '../../../components/chat/TypingIndicator';
import SuggestionChips from '../../../components/chat/SuggestionChips';
import ChatInput from '../../../components/chat/ChatInput';

export default function Chat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  const sendMessage = async (text) => {
    const msgText = (text || inputText).trim();
    if (!msgText || isTyping) return;

    const now = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: msgText,
      time: now,
      isError: false,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await apiClient.post('/api/chat/message', { message: msgText });

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.data.response,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        isError: false,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorText =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Something went wrong. Please try again.';

      const errMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `Unable to get a response: ${errorText}`,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    Alert.alert('Clear Conversation', 'Start a fresh conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setMessages(INITIAL_MESSAGES),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#4f46e5' }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        edges={['top', 'left', 'right']}
      >
        <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

        <ChatHeader onClear={clearChat} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            ListFooterComponent={isTyping ? <TypingIndicator /> : null}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: '#f8fafc' }}
          />

          {messages.length <= 1 && (
            <SuggestionChips onSelect={sendMessage} disabled={isTyping} />
          )}

          <ChatInput
            inputText={inputText}
            setInputText={setInputText}
            isTyping={isTyping}
            onSend={sendMessage}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
