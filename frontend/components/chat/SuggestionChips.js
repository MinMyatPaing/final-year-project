import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SUGGESTION_CHIPS } from './constants';

export default function SuggestionChips({ onSelect, disabled }) {
  return (
    <View className="px-4 pb-2 bg-slate-50">
      <FlatList
        data={SUGGESTION_CHIPS}
        keyExtractor={(item) => item}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white border border-indigo-100 rounded-full px-3 py-1.5 mr-2 shadow-sm"
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text className="text-indigo-600 text-xs font-medium">{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
