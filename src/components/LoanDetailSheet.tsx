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
import { Loan, LoanPayment, PaymentType } from '../types';
import { useLoans } from '../context/LoanContext';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { money, fmtDate, ymd } from '../utils/formatters';
import { calculateLoanDetails } from '../utils/loanCalculations';
import {
  X,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Phone,
  AlertCircle,
  TrendingUp,
  Receipt,
} from 'lucide-react-native';

interface LoanDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  loan: Loan | null;
  onEditLoan: (loan: Loan) => void;
}

export const LoanDetailSheet: React.FC<LoanDetailSheetProps> = ({
  visible,
  onClose,
  loan,
  onEditLoan,
}) => {
  if (!visible || !loan) return null;

  return (
    <LoanDetailSheetContent
      key={loan.id}
      visible={visible}
      onClose={onClose}
      loan={loan}
      onEditLoan={onEditLoan}
    />
  );
};

const LoanDetailSheetContent: React.FC<LoanDetailSheetProps> = ({
  onClose,
  loan,
  onEditLoan,
}) => {
  const { addPayment, deletePayment, toggleLoanStatus, deleteLoan } = useLoans();
  const { theme, themeMode } = useTheme();
  const { toast } = useToast();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(ymd(new Date()));
  const [payType, setPayType] = useState<PaymentType>('principal');
  const [payNote, setPayNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!loan) return null;

  const isToPay = loan.type === 'to_pay';
  const isSettled = loan.status === 'settled';
  const isDark = themeMode === 'dark';
  const details = calculateLoanDetails(loan);

  const percentPaid =
    loan.principal > 0
      ? Math.min(100, Math.round((details.totalPrincipalPaid / loan.principal) * 100))
      : 100;

  const handleRecordPayment = async () => {
    const numAmt = parseFloat(payAmount);
    if (!isFinite(numAmt) || isNaN(numAmt) || numAmt <= 0) {
      toast('Please enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addPayment(loan.id, {
        amount: numAmt,
        date: payDate || ymd(new Date()),
        type: payType,
        note: payNote.trim(),
      });

      if (res.success) {
        setPayAmount('');
        setPayNote('');
        setShowAddPayment(false);
      } else {
        toast(res.error || 'Failed to record payment');
      }
    } catch {
      toast('Error saving payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = (payment: LoanPayment) => {
    Alert.alert(
      'Remove Repayment Record',
      `Delete payment of ${money(payment.amount)} made on ${fmtDate(payment.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePayment(loan.id, payment.id);
          },
        },
      ]
    );
  };

  const handleToggleSettled = async () => {
    await toggleLoanStatus(loan.id);
  };

  const handleDeleteLoan = () => {
    Alert.alert(
      'Delete Loan',
      `Permanently delete this loan for ${loan.person} and its ${loan.payments?.length || 0} repayment records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLoan(loan.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
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
            <View style={styles.personBlock}>
              <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
                {loan.person}
              </Text>
              <View style={styles.subHeaderRow}>
                <View
                  style={[
                    styles.typePill,
                    {
                      backgroundColor: isToPay
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(16, 185, 129, 0.12)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      { color: isToPay ? theme.expense : theme.income },
                    ]}
                  >
                    {isToPay ? 'Loan to Pay (ऋण)' : 'Loan to Receive (सापती)'}
                  </Text>
                </View>

                {loan.phone ? (
                  <View style={styles.phoneWrap}>
                    <Phone size={11} color={theme.muted} strokeWidth={2} style={{ marginRight: 3 }} />
                    <Text style={[styles.phoneText, { color: theme.muted }]}>{loan.phone}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onEditLoan(loan);
                }}
                style={styles.iconBtn}
              >
                <Edit2 size={17} color={theme.accent} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <X size={20} color={theme.muted} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Main Outstanding Banner */}
            <View
              style={[
                styles.outstandingBanner,
                {
                  backgroundColor: isDark ? '#151b28' : '#0f172a',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
                },
              ]}
            >
              <View style={styles.bannerTop}>
                <Text style={styles.bannerLabel}>
                  {isToPay ? 'Current Total to Pay' : 'Current Total to Receive'}
                </Text>
                <TouchableOpacity
                  onPress={handleToggleSettled}
                  style={[
                    styles.settledToggleBtn,
                    {
                      backgroundColor: isSettled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    },
                  ]}
                >
                  <CheckCircle2
                    size={12}
                    color={isSettled ? '#10b981' : '#94a3b8'}
                    strokeWidth={2.4}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.settledToggleText,
                      { color: isSettled ? '#10b981' : '#94a3b8' },
                    ]}
                  >
                    {isSettled ? 'Settled ✓' : 'Mark Settled'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.bannerAmount,
                  { color: isSettled ? '#86efac' : isToPay ? '#fca5a5' : '#86efac' },
                ]}
              >
                {money(details.totalOutstanding)}
              </Text>

              {/* Progress bar */}
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1e293b' : '#334155' }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${percentPaid}%`,
                        backgroundColor: isSettled ? '#10b981' : isToPay ? '#ef4444' : '#3b82f6',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>{percentPaid}% Principal Repaid</Text>
              </View>
            </View>

            {/* Comprehensive Financial Breakdown Matrix */}
            <View style={[styles.matrixCard, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
              <View style={styles.matrixRow}>
                <View style={styles.matrixCol}>
                  <Text style={[styles.matrixLabel, { color: theme.muted }]}>Original Principal</Text>
                  <Text style={[styles.matrixVal, { color: theme.text }]}>{money(loan.principal)}</Text>
                </View>

                <View style={styles.matrixDivider} />

                <View style={styles.matrixCol}>
                  <Text style={[styles.matrixLabel, { color: theme.muted }]}>Remaining Principal</Text>
                  <Text style={[styles.matrixVal, { color: theme.text, fontWeight: '700' }]}>
                    {money(details.remainingPrincipal)}
                  </Text>
                </View>
              </View>

              <View style={[styles.matrixRow, styles.matrixRowBorder, { borderTopColor: theme.line }]}>
                <View style={styles.matrixCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TrendingUp size={11} color="#f59e0b" strokeWidth={2.2} style={{ marginRight: 3 }} />
                    <Text style={[styles.matrixLabel, { color: '#f59e0b' }]}>Interest Rate</Text>
                  </View>
                  <Text style={[styles.matrixVal, { color: '#f59e0b', fontWeight: '700' }]}>
                    {loan.interestType === 'none'
                      ? '0% Sapati'
                      : `${loan.interestRate}% / ${loan.interestType === 'monthly' ? 'mo' : 'yr'}`}
                  </Text>
                </View>

                <View style={styles.matrixDivider} />

                <View style={styles.matrixCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={11} color="#f59e0b" strokeWidth={2} style={{ marginRight: 3 }} />
                    <Text style={[styles.matrixLabel, { color: '#f59e0b' }]}>Counting Interest</Text>
                  </View>
                  <Text style={[styles.matrixVal, { color: '#f59e0b', fontWeight: '700' }]}>
                    +{money(details.unpaidInterest)}
                  </Text>
                </View>
              </View>

              <View style={[styles.matrixRow, styles.matrixRowBorder, { borderTopColor: theme.line }]}>
                <View style={styles.matrixCol}>
                  <Text style={[styles.matrixLabel, { color: theme.muted }]}>Total Interest Paid</Text>
                  <Text style={[styles.matrixVal, { color: theme.text }]}>{money(details.totalInterestPaid)}</Text>
                </View>

                <View style={styles.matrixDivider} />

                <View style={styles.matrixCol}>
                  <Text style={[styles.matrixLabel, { color: theme.muted }]}>Elapsed Duration</Text>
                  <Text style={[styles.matrixVal, { color: theme.text }]}>
                    {details.elapsedDays} days ({details.elapsedMonths} mo)
                  </Text>
                </View>
              </View>
            </View>

            {/* Repayments History / Child Transactions */}
            <View style={styles.paymentsSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Receipt size={16} color={theme.text} strokeWidth={2.2} style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Repayment History ({loan.payments?.length || 0})
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.addPaymentBtn, { backgroundColor: isToPay ? theme.expense : theme.income }]}
                  onPress={() => setShowAddPayment(prev => !prev)}
                  activeOpacity={0.85}
                >
                  <Plus size={14} color="#ffffff" strokeWidth={2.4} style={{ marginRight: 4 }} />
                  <Text style={styles.addPaymentBtnText}>Record Payment</Text>
                </TouchableOpacity>
              </View>

              {/* Add Child Payment Form Accordion */}
              {showAddPayment && (
                <View
                  style={[
                    styles.paymentFormCard,
                    { backgroundColor: theme.fieldBg, borderColor: theme.line },
                  ]}
                >
                  <Text style={[styles.formTitle, { color: theme.text }]}>
                    {isToPay ? 'Record Payment Made' : 'Record Payment Received'}
                  </Text>

                  {/* Payment Amount */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: theme.muted }]}>Amount (NRS) *</Text>
                    <TextInput
                      value={payAmount}
                      onChangeText={setPayAmount}
                      placeholder="e.g. 10000"
                      placeholderTextColor={theme.muted}
                      keyboardType="numeric"
                      style={[
                        styles.formInput,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.line,
                          color: isToPay ? theme.expense : theme.income,
                          fontWeight: '700',
                          fontSize: 18,
                        },
                      ]}
                    />
                  </View>

                  {/* Payment Allocation Type */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: theme.muted }]}>Payment Towards</Text>
                    <View style={styles.typePillRow}>
                      {[
                        { key: 'principal', label: 'Principal Only' },
                        { key: 'interest', label: 'Interest Only' },
                        { key: 'both', label: 'Both / Combined' },
                      ].map(t => {
                        const isSel = payType === t.key;
                        return (
                          <TouchableOpacity
                            key={t.key}
                            style={[
                              styles.typeSelectPill,
                              {
                                backgroundColor: isSel ? theme.text : theme.card,
                                borderColor: isSel ? theme.text : theme.line,
                              },
                            ]}
                            onPress={() => setPayType(t.key as PaymentType)}
                          >
                            <Text
                              style={[
                                styles.typeSelectPillText,
                                {
                                  color: isSel ? theme.card : theme.muted,
                                  fontWeight: isSel ? '700' : '500',
                                },
                              ]}
                            >
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Payment Date & Note */}
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={[styles.formLabel, { color: theme.muted }]}>Date</Text>
                      <TextInput
                        value={payDate}
                        onChangeText={setPayDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.muted}
                        style={[
                          styles.formInput,
                          { backgroundColor: theme.card, borderColor: theme.line, color: theme.text },
                        ]}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1.5 }]}>
                      <Text style={[styles.formLabel, { color: theme.muted }]}>Note / Mode</Text>
                      <TextInput
                        value={payNote}
                        onChangeText={setPayNote}
                        placeholder="e.g. eSewa, Bank"
                        placeholderTextColor={theme.muted}
                        style={[
                          styles.formInput,
                          { backgroundColor: theme.card, borderColor: theme.line, color: theme.text },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.formBtnRow}>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: theme.line }]}
                      onPress={() => setShowAddPayment(false)}
                    >
                      <Text style={[styles.cancelBtnText, { color: theme.muted }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.submitPaymentBtn,
                        { backgroundColor: isToPay ? theme.expense : theme.income },
                      ]}
                      onPress={handleRecordPayment}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.submitPaymentBtnText}>
                        {isSubmitting ? 'Recording...' : 'Confirm Repayment'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* List of Payments */}
              {(!loan.payments || loan.payments.length === 0) ? (
                <View style={[styles.emptyPayments, { backgroundColor: theme.fieldBg }]}>
                  <AlertCircle size={22} color={theme.muted} strokeWidth={1.8} style={{ marginBottom: 6 }} />
                  <Text style={[styles.emptyPaymentsText, { color: theme.muted }]}>
                    No repayments recorded yet. Use the Record Payment button above when a payment is made.
                  </Text>
                </View>
              ) : (
                <View style={styles.paymentListWrap}>
                  {loan.payments.map((p, idx) => (
                    <View
                      key={p.id || idx}
                      style={[
                        styles.paymentItem,
                        {
                          backgroundColor: theme.fieldBg,
                          borderColor: theme.line,
                        },
                      ]}
                    >
                      <View style={styles.paymentLeft}>
                        <View style={styles.paymentTitleRow}>
                          <Text style={[styles.paymentAmt, { color: theme.text }]}>
                            {money(p.amount)}
                          </Text>
                          <View
                            style={[
                              styles.payTypeTag,
                              {
                                backgroundColor:
                                  p.type === 'interest'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.payTypeTagText,
                                { color: p.type === 'interest' ? '#f59e0b' : '#3b82f6' },
                              ]}
                            >
                              {p.type === 'interest'
                                ? 'Interest'
                                : p.type === 'principal'
                                ? 'Principal'
                                : 'Combined'}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.paymentMeta, { color: theme.muted }]}>
                          {fmtDate(p.date)} {p.note ? `• ${p.note}` : ''}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeletePayment(p)}
                        style={styles.delPayBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color={theme.muted} strokeWidth={1.8} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Delete Loan Button at the very bottom */}
            <TouchableOpacity
              style={[styles.dangerDeleteBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
              onPress={handleDeleteLoan}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color={theme.expense} strokeWidth={2} style={{ marginRight: 6 }} />
              <Text style={[styles.dangerDeleteText, { color: theme.expense }]}>
                Delete Entire Loan Record
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '92%',
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
  personBlock: {
    flex: 1,
    marginRight: 10,
  },
  personName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  phoneWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 11,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  outstandingBanner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  bannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  settledToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  settledToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bannerAmount: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  progressWrap: {
    marginTop: 8,
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
  },
  matrixCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  matrixRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  matrixRowBorder: {
    borderTopWidth: 1,
  },
  matrixCol: {
    flex: 1,
  },
  matrixDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 10,
  },
  matrixLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  matrixVal: {
    fontSize: 13,
  },
  paymentsSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addPaymentBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  paymentFormCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  formInput: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 13,
  },
  typePillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeSelectPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeSelectPillText: {
    fontSize: 11,
  },
  formRow: {
    flexDirection: 'row',
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitPaymentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitPaymentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyPayments: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPaymentsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  paymentListWrap: {
    gap: 8,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentAmt: {
    fontSize: 14,
    fontWeight: '700',
  },
  payTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  payTypeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paymentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  delPayBtn: {
    padding: 6,
  },
  dangerDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  dangerDeleteText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
