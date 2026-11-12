import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Transaction } from '../types';
import { num, fmtDate, fmtTime } from '../utils/formatters';
import { Mail, Send, X, ArrowUpRight } from 'lucide-react-native';

interface TransactionListProps {
  onSelectTransaction: (tx: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onSelectTransaction,
}) => {
  const {
    filteredTransactions,
    transactions,
    isExporting,
    emailStatement,
    typeFilter,
    search,
    fromDate,
    toDate,
  } = useTransactions();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [showExportModal, setShowExportModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(user?.email || '');
  const [previewLink, setPreviewLink] = useState<string | null>(null);

  const countText = `${filteredTransactions.length} ${
    filteredTransactions.length === 1 ? 'item' : 'items'
  }`;

  const renderItem = ({ item: tx, index }: { item: Transaction; index: number }) => {
    const isIncome = tx.type === 'income';
    const isLast = index === filteredTransactions.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.txRow,
          !isLast && [styles.txRowBorder, { borderBottomColor: theme.line }],
        ]}
        onPress={() => onSelectTransaction(tx)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View
          style={[
            styles.txIcon,
            {
              backgroundColor: isIncome
                ? 'rgba(34,197,94,0.13)'
                : 'rgba(239,68,68,0.12)',
            },
          ]}
        >
          <Text
            style={[
              styles.arrowIconText,
              { color: isIncome ? theme.income : theme.expense },
            ]}
          >
            {isIncome ? '↑' : '↓'}
          </Text>
        </View>

        {/* Main Details */}
        <View style={styles.txMain}>
          <Text style={[styles.txNote, { color: theme.text }]} numberOfLines={1}>
            {tx.note || tx.category}
          </Text>
          <View style={styles.txMeta}>
            <Text style={[styles.metaText, { color: theme.muted }]}>
              {fmtDate(tx.date)}
            </Text>
            <Text style={[styles.metaSep, { color: theme.muted }]}>·</Text>
            <Text style={[styles.metaText, { color: theme.muted }]}>
              {fmtTime(tx.time || tx.createdAt)}
            </Text>
            <Text style={[styles.metaSep, { color: theme.muted }]}>·</Text>
            <Text style={[styles.metaText, { color: theme.muted }]}>
              {tx.category}
            </Text>
            {!tx.synced && (
              <View style={[styles.unsyncedDot, { backgroundColor: theme.accent }]} />
            )}
          </View>
        </View>

        {/* Amount */}
        <Text
          style={[
            styles.txAmount,
            { color: isIncome ? theme.income : theme.expense },
          ]}
        >
          {isIncome ? '+' : '−'}
          {num(tx.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Head with Item Count & PDF Export Option */}
      <View style={styles.sectionHead}>
        <View style={styles.headLeft}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Transactions</Text>
          <Text style={[styles.countBadge, { color: theme.muted }]}>{countText}</Text>
        </View>

        {filteredTransactions.length > 0 && (
          <TouchableOpacity
            style={[styles.exportBtn, { borderColor: theme.line, backgroundColor: theme.fieldBg }]}
            onPress={() => {
              setRecipientEmail(user?.email || '');
              setPreviewLink(null);
              setShowExportModal(true);
            }}
            activeOpacity={0.75}
          >
            <Mail size={12} color={theme.text} strokeWidth={2} />
            <Text style={[styles.exportBtnText, { color: theme.text }]}>Export PDF</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List Card */}
      <View
        style={[
          styles.listCard,
          { backgroundColor: theme.card, borderColor: theme.line },
        ]}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {transactions.length === 0
                ? 'No transactions yet.\nTap + to add your first.'
                : 'No matching transactions'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
          />
        )}
      </View>

      {/* Email PDF Export Modal — Sharp Boxy Modern Brutalist Design */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.exportModalCard, { backgroundColor: theme.card, borderColor: theme.line }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Mail size={16} color={theme.text} strokeWidth={2.4} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Export Statement PDF</Text>
              </View>
              <TouchableOpacity onPress={() => setShowExportModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.muted }]}>
              A clean tabular PDF statement of {filteredTransactions.length} filtered transactions will be emailed to:
            </Text>

            <TextInput
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="recipient@example.com"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.emailInput,
                { color: theme.text, borderColor: theme.line, backgroundColor: theme.fieldBg },
              ]}
            />

            <View style={[styles.filterNotice, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
              <Text style={[styles.filterNoticeTitle, { color: theme.muted }]}>APPLIED FILTER PRESERVED</Text>
              <Text style={[styles.filterNoticeText, { color: theme.text }]}>
                Type: {typeFilter.toUpperCase()} • Search: {search ? `"${search}"` : 'None'} • Range: {fromDate && toDate ? `${fromDate} to ${toDate}` : fromDate ? `From ${fromDate}` : toDate ? `Up to ${toDate}` : 'All Recorded Dates'}
              </Text>
            </View>

            {previewLink && (
              <TouchableOpacity
                style={[styles.previewPill, { borderColor: theme.income }]}
                onPress={() => Linking.openURL(previewLink)}
              >
                <Text style={[styles.previewPillText, { color: theme.income }]}>Open Email Preview & Download PDF</Text>
                <ArrowUpRight size={13} color={theme.income} />
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn, { borderColor: theme.line }]}
                onPress={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.sendModalBtn, { backgroundColor: theme.text }]}
                onPress={async () => {
                  const res = await emailStatement(recipientEmail);
                  if (res.success) {
                    if (res.previewUrl) {
                      setPreviewLink(res.previewUrl);
                    } else {
                      setShowExportModal(false);
                    }
                  }
                }}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={theme.card} />
                ) : (
                  <View style={styles.btnRow}>
                    <Send size={13} color={theme.card} strokeWidth={2.2} style={{ marginRight: 6 }} />
                    <Text style={[styles.modalBtnText, { color: theme.card, fontWeight: '700' }]}>Send Email</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  countBadge: {
    fontSize: 11.5,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 0,
    borderWidth: 1,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  listCard: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 72,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  txRowBorder: {
    borderBottomWidth: 1,
  },
  txIcon: {
    width: 30,
    height: 30,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  arrowIconText: {
    fontSize: 13,
    fontWeight: '700',
  },
  txMain: {
    flex: 1,
    minWidth: 0,
  },
  txNote: {
    fontSize: 13,
    fontWeight: '550' as any,
    letterSpacing: -0.1,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: 4,
  },
  metaText: {
    fontSize: 10.5,
  },
  metaSep: {
    fontSize: 10.5,
    opacity: 0.5,
  },
  unsyncedDot: {
    width: 5,
    height: 5,
    borderRadius: 0,
    marginLeft: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  emptyWrap: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  exportModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 0,
    borderWidth: 1.5,
    padding: 18,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
  },
  filterNotice: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 10,
    gap: 3,
  },
  filterNoticeTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filterNoticeText: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 0,
  },
  previewPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  cancelModalBtn: {
    borderWidth: 1,
  },
  sendModalBtn: {},
  modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
