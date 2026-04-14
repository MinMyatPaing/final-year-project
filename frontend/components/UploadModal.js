import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import apiClient from '../api/client';
import '../global.css';

// ─── Upload flow stages ───────────────────────────────────────────────────────
const STAGE = {
  IDLE: 'idle',
  PICKED: 'picked',
  PROCESSING: 'processing',
  REVIEW: 'review',
  SAVING: 'saving',
  DONE: 'done',
};

// ─── Blank transaction template for "Add new" ─────────────────────────────────
const BLANK_TRANSACTION = () => ({
  _id: `new_${Date.now()}_${Math.random()}`, // local-only key
  date: '',
  description: '',
  amount: '',
  balance: '',
  category: '',
  merchant: '',
});

// ─── Inline edit row ──────────────────────────────────────────────────────────
function EditableRow({ txn, onChange, onRemove, isNew }) {
  const amt = parseFloat(txn.amount);
  const isCredit = !isNaN(amt) && amt >= 0;

  return (
    <View className="bg-white border border-slate-200 rounded-2xl p-3 mb-2">
      {/* Top row: icon + remove button */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-7 h-7 rounded-full items-center justify-center ${
              isNew ? 'bg-indigo-100' : isCredit ? 'bg-emerald-100' : 'bg-rose-100'
            }`}
          >
            <Ionicons
              name={isNew ? 'add' : isCredit ? 'arrow-down' : 'arrow-up'}
              size={13}
              color={isNew ? '#6366f1' : isCredit ? '#10b981' : '#f43f5e'}
            />
          </View>
          <Text className="text-slate-500 text-xs">
            {isNew ? 'New transaction' : 'Edit transaction'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color="#f43f5e" />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs mb-2"
        placeholder="Description"
        placeholderTextColor="#94a3b8"
        value={txn.description}
        onChangeText={(v) => onChange('description', v)}
        returnKeyType="next"
      />

      {/* Date + Amount row */}
      <View className="flex-row gap-2 mb-2">
        <TextInput
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs"
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor="#94a3b8"
          value={txn.date}
          onChangeText={(v) => onChange('date', v)}
          keyboardType="default"
          returnKeyType="next"
        />
        <TextInput
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs"
          placeholder="Amount (e.g. -22.50)"
          placeholderTextColor="#94a3b8"
          value={String(txn.amount)}
          onChangeText={(v) => onChange('amount', v)}
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
        />
      </View>

      {/* Balance + Category row */}
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs"
          placeholder="Balance (optional)"
          placeholderTextColor="#94a3b8"
          value={txn.balance !== null && txn.balance !== undefined ? String(txn.balance) : ''}
          onChangeText={(v) => onChange('balance', v)}
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
        />
        <TextInput
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs"
          placeholder="Category (optional)"
          placeholderTextColor="#94a3b8"
          value={txn.category || ''}
          onChangeText={(v) => onChange('category', v)}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

// ─── Read-only row (collapsed view) ──────────────────────────────────────────
function ReadOnlyRow({ txn, onEdit, onRemove }) {
  const amt = parseFloat(txn.amount);
  const isCredit = !isNaN(amt) && amt >= 0;

  const formatAmount = (a) => {
    const n = parseFloat(a);
    if (isNaN(n)) return '£?';
    return n >= 0 ? `+£${n.toFixed(2)}` : `-£${Math.abs(n).toFixed(2)}`;
  };

  return (
    <View className="flex-row items-center py-2.5 border-b border-slate-100">
      {/* Colour dot */}
      <View
        className={`w-7 h-7 rounded-full items-center justify-center mr-2.5 ${
          isCredit ? 'bg-emerald-100' : 'bg-rose-100'
        }`}
      >
        <Ionicons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={12}
          color={isCredit ? '#10b981' : '#f43f5e'}
        />
      </View>

      {/* Description + date */}
      <View className="flex-1 mr-2">
        <Text className="text-slate-800 text-xs font-medium" numberOfLines={1}>
          {txn.description || '(no description)'}
        </Text>
        <Text className="text-slate-400 text-xs mt-0.5">
          {txn.date || '—'}
          {txn.category ? ` · ${txn.category}` : ''}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className={`text-xs font-bold mr-3 ${
          isCredit ? 'text-emerald-600' : 'text-rose-500'
        }`}
      >
        {formatAmount(txn.amount)}
      </Text>

      {/* Edit / Remove */}
      <TouchableOpacity
        onPress={onEdit}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="mr-2"
      >
        <Ionicons name="pencil-outline" size={15} color="#6366f1" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      >
        <Ionicons name="trash-outline" size={15} color="#f43f5e" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function UploadModal({ visible, onClose, onUploadSuccess }) {
  const [stage, setStage] = useState(STAGE.IDLE);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  // Editable transaction list (local state — no DB until confirmed)
  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null); // _id of row being edited inline

  const [bankName, setBankName] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [message, setMessage] = useState('');

  // ── File picker ─────────────────────────────────────────────────────────────
  const handlePickDocument = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setSelectedFile(result.assets[0]);
        setStage(STAGE.PICKED);
      }
    } catch {
      setError('Failed to pick document. Please try again.');
    }
  };

  // ── Step 1: send PDF → backend → agent → Claude Vision ──────────────────────
  const handleProcess = async () => {
    if (!selectedFile) return;
    setStage(STAGE.PROCESSING);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: 'application/pdf',
      });

      const res = await apiClient.post('/api/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300_000,
      });

      const data = res.data;

      if (!data.success || !data.transactions?.length) {
        setError(
          data.message ||
            'No transactions could be extracted. Please check the file is a valid bank statement.'
        );
        setStage(STAGE.PICKED);
        return;
      }

      // Attach a local _id to each transaction for keyed editing
      const tagged = data.transactions.map((t, i) => ({
        ...t,
        _id: `extracted_${i}_${Date.now()}`,
      }));

      setTransactions(tagged);
      setBankName(data.bank_name || 'Bank');
      setDisclaimer(data.disclaimer || '');
      setMessage(data.message || '');
      setEditingId(null);
      setStage(STAGE.REVIEW);
    } catch (err) {
      const detail =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Upload failed. Make sure the backend and agent are running.';
      setError(detail);
      setStage(STAGE.PICKED);
    }
  };

  // ── Transaction editing helpers ──────────────────────────────────────────────
  const handleFieldChange = useCallback((id, field, value) => {
    setTransactions((prev) =>
      prev.map((t) => (t._id === id ? { ...t, [field]: value } : t))
    );
  }, []);

  const handleRemove = useCallback(
    (id) => {
      Alert.alert('Remove transaction', 'Remove this transaction from the list?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setTransactions((prev) => prev.filter((t) => t._id !== id));
            if (editingId === id) setEditingId(null);
          },
        },
      ]);
    },
    [editingId]
  );

  const handleAddNew = useCallback(() => {
    const blank = BLANK_TRANSACTION();
    setTransactions((prev) => [...prev, blank]);
    setEditingId(blank._id);
  }, []);

  // ── Step 2: confirm → bulk-save to MongoDB + Pinecone ───────────────────────
  const handleConfirm = async () => {
    // Strip the local _id before sending
    const payload = transactions.map(({ _id, ...rest }) => ({
      ...rest,
      amount: parseFloat(rest.amount) || 0,
      balance:
        rest.balance !== '' && rest.balance !== null && rest.balance !== undefined
          ? parseFloat(rest.balance)
          : null,
    }));

    setStage(STAGE.SAVING);
    setError('');

    try {
      await apiClient.post('/api/extract/confirm', { transactions: payload });
      setStage(STAGE.DONE);
      onUploadSuccess?.(payload);
    } catch (err) {
      const detail =
        err.response?.data?.error || err.message || 'Failed to save transactions.';
      setError(detail);
      setStage(STAGE.REVIEW);
    }
  };

  // ── Reset & close ────────────────────────────────────────────────────────────
  const handleClose = () => {
    if (stage === STAGE.PROCESSING || stage === STAGE.SAVING) return;
    setStage(STAGE.IDLE);
    setSelectedFile(null);
    setError('');
    setTransactions([]);
    setEditingId(null);
    setBankName('');
    setDisclaimer('');
    setMessage('');
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Derived stats
  const totalIn = transactions
    .filter((t) => parseFloat(t.amount) > 0)
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalOut = transactions
    .filter((t) => parseFloat(t.amount) < 0)
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);

  // ════════════════════════════════════════════════════════════════════════════
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ maxHeight: '92%' }}
      >
        <View className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
          {/* Handle bar */}
          <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-4" />

          {/* ── IDLE / PICKED / PROCESSING ───────────────────────────────── */}
          {(stage === STAGE.IDLE ||
            stage === STAGE.PICKED ||
            stage === STAGE.PROCESSING) && (
            <>
              <View className="flex-row justify-between items-center mb-5">
                <View>
                  <Text className="text-slate-800 text-lg font-bold">
                    Upload Bank Statement
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    PDF format only · max 10 MB
                  </Text>
                </View>
                <TouchableOpacity
                  className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"
                  onPress={handleClose}
                  disabled={stage === STAGE.PROCESSING}
                >
                  <Ionicons name="close" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {stage === STAGE.IDLE ? (
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
                <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center">
                    <View className="w-11 h-11 bg-rose-100 rounded-xl items-center justify-center mr-3">
                      <Ionicons name="document-text" size={22} color="#f43f5e" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-slate-800 text-sm font-semibold"
                        numberOfLines={1}
                      >
                        {selectedFile?.name}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        {formatFileSize(selectedFile?.size)} · PDF Document
                      </Text>
                    </View>
                    {stage !== STAGE.PROCESSING && (
                      <TouchableOpacity
                        className="w-7 h-7 bg-slate-200 rounded-full items-center justify-center"
                        onPress={() => {
                          setSelectedFile(null);
                          setStage(STAGE.IDLE);
                        }}
                      >
                        <Ionicons name="close" size={13} color="#64748b" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {stage === STAGE.PROCESSING && (
                    <View className="mt-3 flex-row items-center">
                      <ActivityIndicator size="small" color="#6366f1" />
                      <Text className="text-indigo-500 text-xs ml-2">
                        Reading statement with AI… this may take a minute
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {error ? (
                <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-4">
                  <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
                  <Text className="text-rose-500 text-xs ml-2 flex-1">{error}</Text>
                </View>
              ) : null}

              {/* Privacy banner */}
              <View className="flex-row bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-5">
                <Ionicons name="shield-checkmark-outline" size={16} color="#6366f1" />
                <Text className="text-indigo-600 text-xs ml-2 flex-1 leading-4">
                  Your bank statement is processed by AI to extract transactions only.
                  The original document is{' '}
                  <Text className="font-bold">not stored</Text> and will{' '}
                  <Text className="font-bold">not be used for any other purpose</Text>.
                </Text>
              </View>

              <TouchableOpacity
                className={`rounded-xl py-4 items-center ${
                  stage === STAGE.PICKED ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
                onPress={stage === STAGE.PICKED ? handleProcess : handlePickDocument}
                activeOpacity={0.8}
                disabled={stage === STAGE.PROCESSING}
              >
                {stage === STAGE.PROCESSING ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text
                    className={`text-base font-bold ${
                      stage === STAGE.PICKED ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {stage === STAGE.PICKED ? 'Process Statement' : 'Choose File'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ── REVIEW ───────────────────────────────────────────────────── */}
          {stage === STAGE.REVIEW && (
            <>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-slate-800 text-lg font-bold">
                    Review & Edit Transactions
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={2}>
                    {message}
                  </Text>
                </View>
                <TouchableOpacity
                  className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Bank badge + stats */}
              <View className="flex-row items-center mb-2 gap-2 flex-wrap">
                <View className="bg-indigo-100 rounded-lg px-3 py-1">
                  <Text className="text-indigo-700 text-xs font-bold">{bankName}</Text>
                </View>
                <View className="bg-emerald-50 rounded-lg px-3 py-1">
                  <Text className="text-emerald-700 text-xs">
                    +£{totalIn.toFixed(2)} in
                  </Text>
                </View>
                <View className="bg-rose-50 rounded-lg px-3 py-1">
                  <Text className="text-rose-600 text-xs">
                    -£{totalOut.toFixed(2)} out
                  </Text>
                </View>
                <View className="bg-slate-100 rounded-lg px-3 py-1">
                  <Text className="text-slate-600 text-xs">
                    {transactions.length} rows
                  </Text>
                </View>
              </View>

              {/* Disclaimer */}
              {disclaimer ? (
                <View className="flex-row bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-2">
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color="#d97706"
                  />
                  <Text className="text-amber-700 text-xs ml-2 flex-1 leading-4">
                    {disclaimer}
                  </Text>
                </View>
              ) : null}

              {/* Edit hint */}
              <View className="flex-row items-center mb-2">
                <Ionicons name="pencil-outline" size={12} color="#94a3b8" />
                <Text className="text-slate-400 text-xs ml-1">
                  Tap ✏ to edit a row · tap 🗑 to remove · tap "+ Add" to add a new one
                </Text>
              </View>

              {/* Transaction list */}
              <ScrollView
                style={{ maxHeight: 340 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                className="mb-3"
              >
                {transactions.map((t) =>
                  editingId === t._id ? (
                    <View key={t._id}>
                      <EditableRow
                        txn={t}
                        isNew={t._id.startsWith('new_')}
                        onChange={(field, value) =>
                          handleFieldChange(t._id, field, value)
                        }
                        onRemove={() => handleRemove(t._id)}
                      />
                      {/* Done editing button */}
                      <TouchableOpacity
                        className="bg-indigo-50 border border-indigo-200 rounded-xl py-2 items-center mb-2"
                        onPress={() => setEditingId(null)}
                      >
                        <Text className="text-indigo-600 text-xs font-semibold">
                          ✓ Done editing
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <ReadOnlyRow
                      key={t._id}
                      txn={t}
                      onEdit={() => setEditingId(t._id)}
                      onRemove={() => handleRemove(t._id)}
                    />
                  )
                )}

                {/* Add new transaction button */}
                <TouchableOpacity
                  className="flex-row items-center justify-center border border-dashed border-indigo-300 rounded-xl py-3 mt-2"
                  onPress={handleAddNew}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#6366f1" />
                  <Text className="text-indigo-600 text-xs font-semibold ml-1.5">
                    Add transaction
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Error */}
              {error ? (
                <View className="flex-row items-center bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-3">
                  <Ionicons name="alert-circle-outline" size={16} color="#f43f5e" />
                  <Text className="text-rose-500 text-xs ml-2 flex-1">{error}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 border border-slate-200 rounded-xl py-3.5 items-center"
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text className="text-slate-600 text-sm font-semibold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-2 rounded-xl py-3.5 items-center px-5 ${
                    transactions.length === 0 ? 'bg-slate-300' : 'bg-indigo-600'
                  }`}
                  onPress={transactions.length > 0 ? handleConfirm : undefined}
                  activeOpacity={0.8}
                  disabled={transactions.length === 0}
                >
                  <Text className="text-white text-sm font-bold">
                    Confirm & Save ({transactions.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── SAVING ───────────────────────────────────────────────────── */}
          {stage === STAGE.SAVING && (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#6366f1" />
              <Text className="text-slate-600 text-sm mt-4 font-medium">
                Saving {transactions.length} transactions…
              </Text>
            </View>
          )}

          {/* ── DONE ─────────────────────────────────────────────────────── */}
          {stage === STAGE.DONE && (
            <>
              <View className="items-center py-8">
                <View className="w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle" size={40} color="#10b981" />
                </View>
                <Text className="text-slate-800 text-lg font-bold text-center">
                  All done!
                </Text>
                <Text className="text-slate-500 text-sm text-center mt-1">
                  {transactions.length} transactions from your {bankName} statement
                  have been saved.
                </Text>
              </View>
              <TouchableOpacity
                className="bg-emerald-500 rounded-xl py-4 items-center"
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text className="text-white text-base font-bold">Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
