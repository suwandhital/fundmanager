import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Transaction, TransactionType } from '../types';
import { CATEGORIES, ymd, fmtTime } from '../utils/formatters';
import { X } from 'lucide-react-native';

interface TransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  transactionToEdit: Transaction | null;
}

export const TransactionSheet: React.FC<TransactionSheetProps> = ({
  visible,
  onClose,
  transactionToEdit,
}) => {
  if (!visible) return null;

  return (
    <TransactionSheetForm
      key={transactionToEdit ? transactionToEdit.id : 'new-tx'}
      visible={visible}
      onClose={onClose}
      transactionToEdit={transactionToEdit}
    />
  );
};

const TransactionSheetForm: React.FC<TransactionSheetProps> = ({
  visible,
  onClose,
  transactionToEdit,
}) => {
  const { saveTransaction, deleteTransaction } = useTransactions();
  const { theme } = useTheme();
  const { toast } = useToast();

  const isEditing = !!transactionToEdit;

  const [type, setType] = useState<TransactionType>(
    transactionToEdit?.type || 'expense'
  );
  const [amount, setAmount] = useState(
    transactionToEdit ? String(transactionToEdit.amount) : ''
  );
  const [note, setNote] = useState(transactionToEdit?.note || '');
  const [category, setCategory] = useState(
    transactionToEdit?.category || (type === 'income' ? 'Salary' : 'Food')
  );
  const [date, setDate] = useState(
    transactionToEdit?.date || ymd(new Date())
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initTimestamp] = useState(() => Date.now());

  const isIncome = type === 'income';
  const activeColor = isIncome ? theme.income : theme.expense;
  const activeAmountBg = isIncome
    ? 'rgba(34, 197, 94, 0.11)'
    : 'rgba(239, 68, 68, 0.10)';

  const availableCategories = CATEGORIES[type];

  // Adjust category when switching type if current category isn't in new list
  const handleTypeSelect = (newType: TransactionType) => {
    setType(newType);
    if (!CATEGORIES[newType].includes(category)) {
      setCategory(CATEGORIES[newType][0] || 'Other');
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      toast('Enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveTransaction({
        id: transactionToEdit?.id,
        type,
        amount,
        note,
        category,
        date: date || ymd(new Date()),
      });
      if (res.success) {
        onClose();
      } else {
        toast(res.error || 'Failed to save');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!transactionToEdit) return;

    const confirmDelete = () => {
      deleteTransaction(transactionToEdit.id);
      onClose();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this transaction?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Transaction',
        'Delete this transaction?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const recordedTimeHint = isEditing
    ? `Recorded at ${fmtTime(transactionToEdit.createdAt)} — this time is kept as-is.`
    : `Recorded at ${fmtTime(initTimestamp)} (system time).`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={[styles.sheet, { backgroundColor: theme.card }]}>
              {/* Colored Handle */}
              <View style={[styles.sheetHandle, { backgroundColor: activeColor }]} />

              {/* Sheet Head */}
              <View style={styles.sheetHead}>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>
                  {isEditing ? 'Edit transaction' : 'New transaction'}
                </Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.card, borderColor: theme.line }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <X size={16} color={theme.text} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
                {/* Type Toggle */}
                <View style={[styles.typeToggle, { backgroundColor: theme.track }]}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      isIncome && [styles.toggleBtnActive, { backgroundColor: theme.income }],
                    ]}
                    onPress={() => handleTypeSelect('income')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: isIncome ? '#FFFFFF' : theme.muted },
                      ]}
                    >
                      Income
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      !isIncome && [styles.toggleBtnActive, { backgroundColor: theme.expense }],
                    ]}
                    onPress={() => handleTypeSelect('expense')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: !isIncome ? '#FFFFFF' : theme.muted },
                      ]}
                    >
                      Expense
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Amount Box */}
                <View style={[styles.amountWrap, { backgroundColor: activeAmountBg }]}>
                  <Text style={[styles.amountPrefix, { color: activeColor }]}>NRS</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    style={[styles.amountInput, { color: activeColor }]}
                    autoFocus={!isEditing}
                  />
                </View>

                {/* Note */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Note</Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. Momo & chiya"
                    placeholderTextColor={theme.muted}
                    maxLength={60}
                    style={[
                      styles.field,
                      {
                        backgroundColor: theme.fieldBg,
                        borderColor: theme.line,
                        color: theme.text,
                      },
                    ]}
                  />
                </View>

                {/* Category & Date */}
                <View style={styles.fieldRow}>
                  {/* Category Pill Selector */}
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Category</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.catScroll}
                    >
                      {availableCategories.map(cat => {
                        const isSelected = category === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.catChip,
                              {
                                backgroundColor: isSelected ? theme.text : theme.fieldBg,
                                borderColor: isSelected ? theme.text : theme.line,
                              },
                            ]}
                            onPress={() => setCategory(cat)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.catChipText,
                                { color: isSelected ? theme.card : theme.text },
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Date Input */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate((e.target as HTMLInputElement).value)}
                      style={{
                        height: 40,
                        borderRadius: 12,
                        border: `1px solid ${theme.line}`,
                        backgroundColor: theme.fieldBg,
                        color: theme.text,
                        fontSize: 14,
                        paddingLeft: 13,
                        paddingRight: 13,
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        colorScheme: 'auto',
                      } as React.CSSProperties}
                    />
                  ) : (
                    <TextInput
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.muted}
                      style={[
                        styles.field,
                        {
                          backgroundColor: theme.fieldBg,
                          borderColor: theme.line,
                          color: theme.text,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Recorded Time Hint */}
                <Text style={[styles.timeHint, { color: theme.muted }]}>
                  {recordedTimeHint}
                </Text>

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                  {isEditing && (
                    <TouchableOpacity
                      style={[styles.btn, styles.dangerBtn]}
                      onPress={handleDelete}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.btnText, { color: theme.expense }]}>Delete</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      {
                        backgroundColor: theme.text,
                        flex: isEditing ? 2 : 1,
                      },
                    ]}
                    onPress={handleSave}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, { color: theme.card }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginVertical: 8,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 15.5,
    fontWeight: '650' as any,
    letterSpacing: -0.1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  formContent: {
    gap: 10,
    paddingBottom: 16,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  amountPrefix: {
    fontSize: 13,
    fontWeight: '650' as any,
    letterSpacing: 0.2,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '650' as any,
    paddingVertical: 6,
    outlineStyle: 'none' as any,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '650' as any,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingLeft: 2,
  },
  field: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    fontSize: 14,
    outlineStyle: 'none' as any,
  },
  catScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  catChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12.5,
    fontWeight: '550' as any,
  },
  timeHint: {
    fontSize: 10.5,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
});
