import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const QUICK_ACTIONS = [
  { label: 'Add Expense', icon: 'add-circle-outline', color: '#6366f1', bg: '#eef2ff', key: 'add' },
  { label: 'Upload Statement', icon: 'cloud-upload-outline', color: '#06b6d4', bg: '#ecfeff', key: 'upload' },
  { label: 'Budget', icon: 'bar-chart-outline', color: '#10b981', bg: '#ecfdf5', key: 'budget' },
  { label: 'Reports', icon: 'document-text-outline', color: '#f59e0b', bg: '#fffbeb', key: 'reports' },
];

export default function QuickActions({ onAction }) {
  return (
    <View className="mx-4 -mt-6 bg-white rounded-2xl shadow-md p-4 mb-4">
      <View className="flex-row justify-between">
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.key}
            className="items-center"
            activeOpacity={0.7}
            onPress={() => onAction(action.key)}
          >
            <View
              style={{ backgroundColor: action.bg }}
              className="w-12 h-12 rounded-2xl items-center justify-center mb-1.5"
            >
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text
              className="text-slate-600 text-xs font-medium text-center"
              style={{ maxWidth: 62 }}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
