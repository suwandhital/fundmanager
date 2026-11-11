import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { useToast } from '../context/ToastContext';
import { Header } from '../components/Header';
import { BalanceCard } from '../components/BalanceCard';
import { LineChart } from '../components/LineChart';
import { FilterBar } from '../components/FilterBar';
import { TransactionList } from '../components/TransactionList';
import { TransactionSheet } from '../components/TransactionSheet';
import { LoanSummaryCard } from '../components/LoanSummaryCard';
import { LoanList } from '../components/LoanList';
import { LoanSheet } from '../components/LoanSheet';
import { LoanDetailSheet } from '../components/LoanDetailSheet';
import { Transaction, Loan, LoanType } from '../types';
import { Plus, Fingerprint, CreditCard, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

type ActiveTab = 'transactions' | 'to_pay' | 'to_receive';

export const MainScreen: React.FC = () => {
  const { theme } = useTheme();
  const { shouldPromptBio, enableBiometric, dismissBioPrompt } = useAuth();
  const { clearDates, fromDate, toDate } = useTransactions();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<ActiveTab>('transactions');

  // Transaction Sheets State
  const [txSheetVisible, setTxSheetVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Loan Sheets State
  const [loanSheetVisible, setLoanSheetVisible] = useState(false);
  const [loanDetailVisible, setLoanDetailVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [loanSheetDefaultType, setLoanSheetDefaultType] = useState<LoanType>('to_pay');

  // Open FAB depending on active tab
  const handleOpenAdd = () => {
    if (activeTab === 'transactions') {
      setSelectedTx(null);
      setTxSheetVisible(true);
    } else {
      setLoanToEdit(null);
      setLoanSheetDefaultType(activeTab);
      setLoanSheetVisible(true);
    }
  };

  const handleSelectTx = (tx: Transaction) => {
    setSelectedTx(tx);
    setTxSheetVisible(true);
  };

  const handleSelectLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setLoanDetailVisible(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setLoanToEdit(loan);
    setLoanSheetDefaultType(loan.type);
    setLoanSheetVisible(true);
  };

  const handleEnableBio = async () => {
    const res = await enableBiometric();
    if (res.success) {
      toast('Biometric login enabled ✓');
    } else {
      toast(res.error ?? 'Could not enable biometric');
    }
  };

  const hasFilter = !!(fromDate || toDate);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* ── Fixed top controls ── */}
      <Header />

      {/* Little space above total balance section */}
      <View style={styles.balanceSection}>
        <BalanceCard />
      </View>

      {/* Overview Graph: visible on Transactions tab */}
      {activeTab === 'transactions' && (
        <View style={styles.chartSection}>
          <LineChart />
        </View>
      )}

      {/* ── Dynamic Section: switched between Transactions, To Pay & To Receive ── */}
      <View
        style={[
          styles.contentSection,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        {/* ── Segmented Navigation Row (Switching only the lower section) ── */}
        <View style={[styles.tabBar, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'transactions' && [
                styles.tabBtnActive,
                { backgroundColor: theme.text },
              ],
            ]}
            onPress={() => setActiveTab('transactions')}
            activeOpacity={0.8}
          >
            <CreditCard
              size={13}
              color={activeTab === 'transactions' ? theme.card : theme.muted}
              strokeWidth={2.4}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'transactions' ? theme.card : theme.muted,
                  fontWeight: activeTab === 'transactions' ? '700' : '600',
                },
              ]}
            >
              Transactions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'to_pay' && [
                styles.tabBtnActive,
                { backgroundColor: theme.text },
              ],
            ]}
            onPress={() => setActiveTab('to_pay')}
            activeOpacity={0.8}
          >
            <ArrowDownLeft
              size={13}
              color={activeTab === 'to_pay' ? '#f87171' : theme.muted}
              strokeWidth={2.5}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'to_pay' ? theme.card : theme.muted,
                  fontWeight: activeTab === 'to_pay' ? '700' : '600',
                },
              ]}
            >
              To Pay
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'to_receive' && [
                styles.tabBtnActive,
                { backgroundColor: theme.text },
              ],
            ]}
            onPress={() => setActiveTab('to_receive')}
            activeOpacity={0.8}
          >
            <ArrowUpRight
              size={13}
              color={activeTab === 'to_receive' ? '#4ade80' : theme.muted}
              strokeWidth={2.5}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'to_receive' ? theme.card : theme.muted,
                  fontWeight: activeTab === 'to_receive' ? '700' : '600',
                },
              ]}
            >
              To Receive
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab View 1: Transactions (Default view) */}
        {activeTab === 'transactions' && (
          <View style={styles.viewContainer}>
            <View style={styles.filterSection}>
              <FilterBar />
            </View>
            <View style={styles.listContainer}>
              <TransactionList onSelectTransaction={handleSelectTx} />
            </View>
          </View>
        )}

        {/* Tab View 2: To Pay (Debts, Loans taken & Sapati to pay) */}
        {activeTab === 'to_pay' && (
          <View style={styles.viewContainer}>
            <View style={styles.summaryWrap}>
              <LoanSummaryCard type="to_pay" />
            </View>
            <View style={styles.listContainer}>
              <LoanList type="to_pay" onSelectLoan={handleSelectLoan} />
            </View>
          </View>
        )}

        {/* Tab View 3: To Receive (Lent money & Sapati given) */}
        {activeTab === 'to_receive' && (
          <View style={styles.viewContainer}>
            <View style={styles.summaryWrap}>
              <LoanSummaryCard type="to_receive" />
            </View>
            <View style={styles.listContainer}>
              <LoanList type="to_receive" onSelectLoan={handleSelectLoan} />
            </View>
          </View>
        )}
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor:
              activeTab === 'to_pay'
                ? theme.expense
                : activeTab === 'to_receive'
                ? theme.income
                : theme.text,
            bottom: Math.max(insets.bottom, 10) + 16,
          },
        ]}
        onPress={handleOpenAdd}
        activeOpacity={0.88}
      >
        <Plus size={22} color={activeTab === 'transactions' ? theme.card : '#ffffff'} strokeWidth={2.4} />
      </TouchableOpacity>

      {/* Tap anywhere backdrop to clear chart date filter */}
      {hasFilter && activeTab === 'transactions' && (
        <TouchableOpacity
          style={styles.backdropClear}
          onPress={clearDates}
          activeOpacity={1}
          accessible={false}
        />
      )}

      {/* Transaction CRUD Sheet */}
      <TransactionSheet
        visible={txSheetVisible}
        onClose={() => {
          setTxSheetVisible(false);
          setSelectedTx(null);
        }}
        transactionToEdit={selectedTx}
      />

      {/* Loan Create / Edit Sheet */}
      <LoanSheet
        visible={loanSheetVisible}
        onClose={() => {
          setLoanSheetVisible(false);
          setLoanToEdit(null);
        }}
        loanToEdit={loanToEdit}
        defaultType={loanSheetDefaultType}
      />

      {/* Loan Detail & Child Repayments Sheet */}
      <LoanDetailSheet
        visible={loanDetailVisible}
        onClose={() => {
          setLoanDetailVisible(false);
          setSelectedLoan(null);
        }}
        loan={selectedLoan}
        onEditLoan={handleEditLoan}
      />

      {/* Biometric setup prompt modal — asks user on each login until activated */}
      <Modal visible={shouldPromptBio} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.line },
            ]}
          >
            <View style={[styles.modalIcon, { backgroundColor: theme.track }]}>
              <Fingerprint size={32} color={theme.text} strokeWidth={1.8} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Enable Biometric Login
            </Text>
            <Text style={[styles.modalBody, { color: theme.muted }]}>
              Sign in instantly with your fingerprint or face recognition next time you open Suwan&apos;s FundManager.
            </Text>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                { backgroundColor: theme.text },
              ]}
              onPress={handleEnableBio}
              activeOpacity={0.85}
            >
              <Fingerprint size={16} color={theme.card} strokeWidth={1.8} />
              <Text style={[styles.modalBtnText, { color: theme.card }]}>
                Enable Biometric
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                { backgroundColor: theme.track, marginTop: 8 },
              ]}
              onPress={dismissBioPrompt}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalBtnText, { color: theme.muted }]}>
                Ask Me Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  balanceSection: {
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 6,
  },
  chartSection: {
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  contentSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    marginBottom: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 11,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
  },
  viewContainer: {
    flex: 1,
    minHeight: 0,
  },
  filterSection: {
    marginTop: 4,
    marginBottom: 2,
  },
  summaryWrap: {
    marginTop: 4,
    marginBottom: 4,
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  backdropClear: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
