import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import '../global.css';

export default function UploadModal({ visible, onClose, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handlePickDocument = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
        setSuccess(false);
      }
    } catch (err) {
      setError('Failed to pick document. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      // Build multipart form data
      const formData = new FormData();
      formData.append('pdf', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: 'application/pdf',
      });

      // TODO: replace with real backend call when PDF processing is enabled
      // const apiClient = (await import('../api/client')).default;
      // const res = await apiClient.post('/api/extract-and-categorize', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });
      // onUploadSuccess?.(res.data.transactions);

      // Simulate processing delay for now
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSuccess(true);
      if (onUploadSuccess) {
        onUploadSuccess([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 'Upload failed. Make sure the backend is running.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError('');
    setSuccess(false);
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/50"
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* Sheet */}
      <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10" style={{ marginTop: -20 }}>
        {/* Handle bar */}
        <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />

        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-800 text-lg font-bold">Upload Bank Statement</Text>
            <Text className="text-slate-400 text-xs mt-0.5">PDF format only, max 10 MB</Text>
          </View>
          <TouchableOpacity
            className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"
            onPress={handleClose}
          >
            <Ionicons name="close" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Drop Zone / File Picker */}
        {!selectedFile ? (
          <TouchableOpacity
            className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl p-8 items-center mb-4"
            onPress={handlePickDocument}
            activeOpacity={0.7}
          >
            <View className="w-14 h-14 bg-indigo-100 rounded-2xl items-center justify-center mb-3">
              <Ionicons name="document-attach-outline" size={28} color="#6366f1" />
            </View>
            <Text className="text-slate-700 text-sm font-semibold text-center">
              Tap to select a PDF
            </Text>
            <Text className="text-slate-400 text-xs text-center mt-1">
              Choose your bank statement from your files
            </Text>
          </TouchableOpacity>
        ) : (
          /* Selected File Card */
          <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-11 h-11 bg-rose-100 rounded-xl items-center justify-center mr-3">
                <Ionicons name="document-text" size={22} color="#f43f5e" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 text-sm font-semibold" numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text className="text-slate-400 text-xs mt-0.5">
                  {formatFileSize(selectedFile.size)} · PDF Document
                </Text>
              </View>
              <TouchableOpacity
                className="w-7 h-7 bg-slate-200 rounded-full items-center justify-center"
                onPress={() => { setSelectedFile(null); setSuccess(false); }}
              >
                <Ionicons name="close" size={13} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Progress / Success state */}
            {uploading && (
              <View className="mt-3 flex-row items-center">
                <ActivityIndicator size="small" color="#6366f1" />
                <Text className="text-indigo-500 text-xs ml-2">Processing statement…</Text>
              </View>
            )}
            {success && (
              <View className="mt-3 flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text className="text-emerald-500 text-xs ml-1.5 font-medium">
                  Statement processed successfully!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error */}
        {error ? (
          <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
            <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
            <Text className="text-rose-500 text-xs ml-2 flex-1">{error}</Text>
          </View>
        ) : null}

        {/* Info Banner */}
        <View className="flex-row bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-5">
          <Ionicons name="information-circle-outline" size={16} color="#6366f1" />
          <Text className="text-indigo-600 text-xs ml-2 flex-1 leading-4">
            Your bank statement will be processed by our AI to extract and categorise transactions automatically.
          </Text>
        </View>

        {/* Actions */}
        {!success ? (
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              selectedFile && !uploading ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
            onPress={selectedFile && !uploading ? handleUpload : handlePickDocument}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`text-base font-bold ${
                  selectedFile ? 'text-white' : 'text-slate-500'
                }`}
              >
                {selectedFile ? 'Process Statement' : 'Choose File'}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-emerald-500 rounded-xl py-4 items-center"
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-bold">Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}
