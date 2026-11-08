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
import { Transaction } from '../types';
import { Plus, Fingerprint } from 'lucide-react-native';

export const MainScreen: React.FC = () => {
  const { theme } = useTheme();
  const { shouldPromptBio, enableBiometric, dismissBioPrompt } = useAuth();
  const { clearDates, fromDate, toDate } = useTransactions();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const [txSheetVisible, setTxSheetVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleOpenAdd = () => {
    setSelectedTx(null);
    setTxSheetVisible(true);
  };

  const handleSelectTx = (tx: Transaction) => {
    setSelectedTx(tx);
    setTxSheetVisible(true);
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

      {/* Overview Graph */}
      <View style={styles.chartSection}>
        <LineChart />
      </View>

      {/* ── Transaction section: fixed within page, extends to end ── */}
      <View
        style={[
          styles.txSection,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        {/* Little space above search bar */}
        <View style={styles.filterSection}>
          <FilterBar />
        </View>

        {/* Transaction list inside visible card extending to end of page */}
        <View style={styles.listContainer}>
          <TransactionList onSelectTransaction={handleSelectTx} />
        </View>
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: theme.text,
            bottom: Math.max(insets.bottom, 10) + 16,
          },
        ]}
        onPress={handleOpenAdd}
        activeOpacity={0.88}
      >
        <Plus size={22} color={theme.card} strokeWidth={2.4} />
      </TouchableOpacity>

      {/* Tap anywhere backdrop to clear chart date filter */}
      {hasFilter && (
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
    marginTop: 8,
    marginBottom: 8,
  },
  chartSection: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  txSection: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 14,
  },
  filterSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  backdropClear: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  // Biometric prompt modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  modalBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
