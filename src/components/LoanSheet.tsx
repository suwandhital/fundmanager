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
import { useLoans } from '../context/LoanContext';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { Loan, LoanType, InterestType } from '../types';
import { ymd } from '../utils/formatters';
import { X, Trash2, Calendar, Percent, Phone, User as UserIcon, FileText } from 'lucide-react-native';

interface LoanSheetProps {
  visible: boolean;
  onClose: () => void;
  loanToEdit: Loan | null;
  defaultType?: LoanType;
}

export const LoanSheet: React.FC<LoanSheetProps> = ({
  visible,
  onClose,
  loanToEdit,
  defaultType = 'to_pay',
}) => {
  if (!visible) return null;

  return (
    <LoanSheetForm
      key={loanToEdit ? loanToEdit.id : `new-${defaultType}`}
      visible={visible}
      onClose={onClose}
      loanToEdit={loanToEdit}
      defaultType={defaultType}
    />
  );
};

const LoanSheetForm: React.FC<LoanSheetProps> = ({
  visible,
  onClose,
  loanToEdit,
  defaultType = 'to_pay',
}) => {
  const { saveLoan, deleteLoan } = useLoans();
  const { theme } = useTheme();
  const { toast } = useToast();

  const isEditing = !!loanToEdit;

  const [type, setType] = useState<LoanType>(loanToEdit?.type || defaultType);
  const [person, setPerson] = useState(loanToEdit?.person || '');
  const [phone, setPhone] = useState(loanToEdit?.phone || '');
  const [principal, setPrincipal] = useState(loanToEdit ? String(loanToEdit.principal) : '');
  const [startDate, setStartDate] = useState(loanToEdit?.startDate || ymd(new Date()));
  const [dueDate, setDueDate] = useState(loanToEdit?.dueDate || '');
  const [interestType, setInterestType] = useState<InterestType>(loanToEdit?.interestType || 'none');
  const [interestRate, setInterestRate] = useState(
    loanToEdit?.interestRate ? String(loanToEdit.interestRate) : ''
  );
  const [note, setNote] = useState(loanToEdit?.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isToPay = type === 'to_pay';

  const handleSave = async () => {
    if (!person.trim()) {
      toast('Please enter person or organization name');
      return;
    }

    const numPrincipal = parseFloat(principal);
    if (!isFinite(numPrincipal) || isNaN(numPrincipal) || numPrincipal <= 0) {
      toast('Please enter a valid loan amount');
      return;
    }

    let numRate = 0;
    if (interestType !== 'none') {
      numRate = parseFloat(interestRate);
      if (!isFinite(numRate) || isNaN(numRate) || numRate <= 0) {
        toast('Please enter a valid interest percentage');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await saveLoan({
        id: loanToEdit ? loanToEdit.id : null,
        type,
        person: person.trim(),
        phone: phone.trim() || undefined,
        principal: numPrincipal,
        startDate: startDate.trim() || ymd(new Date()),
        dueDate: dueDate.trim() || undefined,
        interestRate: numRate,
        interestType,
        note: note.trim(),
      });

      if (res.success) {
        onClose();
      } else {
        toast(res.error || 'Failed to save loan');
      }
    } catch {
      toast('Error saving loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!loanToEdit) return;

    Alert.alert(
      'Delete Loan Record',
      `Are you sure you want to delete this loan for ${loanToEdit.person}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLoan(loanToEdit.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: theme.overlay }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {isEditing
                ? isToPay
                  ? 'Edit Debt Record'
                  : 'Edit Receivable Record'
                : isToPay
                ? 'Record Borrowed Debt'
                : 'Record Loan Given'}
            </Text>

            <View style={styles.headerRight}>
              {isEditing && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                  <Trash2 size={18} color={theme.expense} strokeWidth={2} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={theme.muted} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Type Switcher */}
            <View style={[styles.typeSwitcher, { backgroundColor: theme.fieldBg }]}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  isToPay && { backgroundColor: theme.expense },
                ]}
                onPress={() => setType('to_pay')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: isToPay ? '#ffffff' : theme.muted },
                    isToPay && { fontWeight: '700' },
                  ]}
                >
                  To Pay (Borrowed)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  !isToPay && { backgroundColor: theme.income },
                ]}
                onPress={() => setType('to_receive')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: !isToPay ? '#ffffff' : theme.muted },
                    !isToPay && { fontWeight: '700' },
                  ]}
                >
                  To Receive (Lent)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Principal Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>Principal Amount (NRS) *</Text>
              <TextInput
                value={principal}
                onChangeText={setPrincipal}
                placeholder="e.g. 50000"
                placeholderTextColor={theme.muted}
                keyboardType="numeric"
                style={[
                  styles.amountInput,
                  {
                    backgroundColor: theme.fieldBg,
                    borderColor: theme.line,
                    color: isToPay ? theme.expense : theme.income,
                  },
                ]}
              />
            </View>

            {/* Person / Entity Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>
                {isToPay ? 'Lender / Creditor Name *' : 'Borrower / Debtor Name *'}
              </Text>
              <View style={[styles.iconInputWrap, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
                <UserIcon size={16} color={theme.muted} strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  value={person}
                  onChangeText={setPerson}
                  placeholder="e.g. Ram Sharma, Nabil Bank"
                  placeholderTextColor={theme.muted}
                  style={[styles.textInput, { color: theme.text }]}
                />
              </View>
            </View>

            {/* Phone Number (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>Phone Number (Optional)</Text>
              <View style={[styles.iconInputWrap, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
                <Phone size={16} color={theme.muted} strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 9841XXXXXX"
                  placeholderTextColor={theme.muted}
                  keyboardType="phone-pad"
                  style={[styles.textInput, { color: theme.text }]}
                />
              </View>
            </View>

            {/* Interest Type Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>Interest Calculation</Text>
              <View style={styles.interestTypeRow}>
                {[
                  { key: 'none', label: '0% Interest Free' },
                  { key: 'monthly', label: 'Monthly %' },
                  { key: 'yearly', label: 'Yearly %' },
                ].map(opt => {
                  const isSel = interestType === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.interestTypeBtn,
                        {
                          backgroundColor: isSel ? theme.text : theme.fieldBg,
                          borderColor: isSel ? theme.text : theme.line,
                        },
                      ]}
                      onPress={() => setInterestType(opt.key as InterestType)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.interestTypeBtnText,
                          { color: isSel ? theme.card : theme.muted },
                          isSel && { fontWeight: '700' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Interest Rate Input (only if not 'none') */}
            {interestType !== 'none' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.muted }]}>
                  {interestType === 'monthly' ? 'Monthly Interest Rate (%) *' : 'Yearly Interest Rate (%) *'}
                </Text>
                <View style={[styles.iconInputWrap, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
                  <Percent size={16} color="#f59e0b" strokeWidth={2.2} style={styles.inputIcon} />
                  <TextInput
                    value={interestRate}
                    onChangeText={setInterestRate}
                    placeholder={interestType === 'monthly' ? 'e.g. 1.5' : 'e.g. 11.5'}
                    placeholderTextColor={theme.muted}
                    keyboardType="numeric"
                    style={[styles.textInput, { color: theme.text, fontWeight: '700' }]}
                  />
                  <Text style={[styles.inputSuffix, { color: theme.muted }]}>
                    % per {interestType === 'monthly' ? 'month' : 'year'}
                  </Text>
                </View>
              </View>
            )}

            {/* Date Inputs: Start Date & Due Date */}
            <View style={styles.dateRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.muted }]}>Date Taken / Lent *</Text>
                <View style={[styles.iconInputWrap, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
                  <Calendar size={15} color={theme.muted} strokeWidth={2} style={styles.inputIcon} />
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.muted}
                    style={[styles.textInput, { color: theme.text }]}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: theme.muted }]}>Due Date (Optional)</Text>
                <View style={[styles.iconInputWrap, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
                  <Calendar size={15} color={theme.muted} strokeWidth={2} style={styles.inputIcon} />
                  <TextInput
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.muted}
                    style={[styles.textInput, { color: theme.text }]}
                  />
                </View>
              </View>
            </View>

            {/* Note / Purpose Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>Note / Purpose (Optional)</Text>
              <View style={[styles.iconInputWrap, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
                <FileText size={16} color={theme.muted} strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Emergency medical bill, Vehicle installment"
                  placeholderTextColor={theme.muted}
                  style={[styles.textInput, { color: theme.text }]}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: isToPay ? theme.expense : theme.income }]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.88}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting
                  ? 'Saving...'
                  : isEditing
                  ? isToPay
                    ? 'Update Debt Record'
                    : 'Update Receivable Record'
                  : isToPay
                  ? 'Save Borrowed Debt'
                  : 'Save Receivable Record'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: 16,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  typeSwitcher: {
    flexDirection: 'row',
    borderRadius: 0,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 0,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '800',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  iconInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 11,
  },
  inputSuffix: {
    fontSize: 12,
    fontWeight: '600',
    paddingLeft: 4,
  },
  interestTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  interestTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
  },
  interestTypeBtnText: {
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
  },
  saveBtn: {
    borderRadius: 0,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
