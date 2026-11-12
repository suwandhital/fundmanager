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
  KeyboardAvoidingView,
} from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Transaction, TransactionType } from '../types';
import { CATEGORIES, ymd, fmtTime } from '../utils/formatters';
import { X, Trash2 } from 'lucide-react-native';

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
    ? 'rgba(34, 197, 94, 0.09)'
    : 'rgba(239, 68, 68, 0.09)';

  const availableCategories = CATEGORIES[type];

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
        'Are you sure you want to delete this transaction?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const recordedTimeHint = isEditing
    ? `Recorded at ${fmtTime(transactionToEdit.createdAt)}`
    : `Current time: ${fmtTime(initTimestamp)}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={[styles.sheet, { backgroundColor: theme.card }]}>
                {/* Handle */}
                <View style={[styles.sheetHandle, { backgroundColor: theme.line }]} />

                {/* Head */}
                <View style={styles.sheetHead}>
                  <View style={styles.headLeft}>
                    <Text style={[styles.sheetTitle, { color: theme.text }]}>
                      {isEditing ? 'Edit Transaction' : 'New Transaction'}
                    </Text>
                    <Text style={[styles.sheetSubtitle, { color: theme.muted }]}>
                      {isEditing ? 'Update amount, category, or note' : 'Record a new income or expense'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: theme.card, borderColor: theme.line }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={theme.text} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={styles.formContent}
                >
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
                <View
                  style={[
                    styles.amountWrap,
                    {
                      backgroundColor: activeAmountBg,
                      borderColor: isIncome ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                    },
                  ]}
                >
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
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Note / Description</Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. Groceries, Momo & chiya, Freelance"
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

                {/* Category */}
                <View style={styles.fieldGroup}>
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

                {/* Date Input */}
                <View style={styles.fieldGroup}>
                  <View style={styles.dateLabelRow}>
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>Date</Text>
                    <Text style={[styles.timeHint, { color: theme.muted }]}>{recordedTimeHint}</Text>
                  </View>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate((e.target as HTMLInputElement).value)}
                      style={{
                        height: 42,
                        borderRadius: 0,
                        border: `1px solid ${theme.line}`,
                        backgroundColor: theme.fieldBg,
                        color: theme.text,
                        fontSize: 14,
                        paddingLeft: 13,
                        paddingRight: 13,
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
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

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {isEditing ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.dangerBtn]}
                      onPress={handleDelete}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={16} color={theme.expense} strokeWidth={2} style={{ marginRight: 6 }} />
                      <Text style={[styles.btnText, { color: theme.expense }]}>Delete</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: theme.track, flex: 1 }]}
                      onPress={onClose}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      {
                        backgroundColor: theme.text,
                        flex: isEditing ? 1.5 : 1.4,
                      },
                    ]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, { color: theme.card }]}>
                      {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transaction'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </Modal>
);
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 0,
    alignSelf: 'center',
    marginVertical: 6,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  headLeft: {
    flex: 1,
    marginRight: 10,
  },
  sheetTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  formContent: {
    gap: 12,
    paddingBottom: 28,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 0,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 10,
  },
  amountPrefix: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 4,
  },
  fieldGroup: {
    gap: 5,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingLeft: 2,
  },
  field: {
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10.5,
    fontSize: 14,
  },
  catScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 0,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  timeHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    borderRadius: 0,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dangerBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
});
