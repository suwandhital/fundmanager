import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { Transaction } from '../types';
import { num, fmtDate } from '../utils/formatters';

interface TransactionListProps {
  onSelectTransaction: (tx: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onSelectTransaction,
}) => {
  const { filteredTransactions, transactions } = useTransactions();
  const { theme } = useTheme();

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
      {/* Section Head */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Transactions</Text>
        <Text style={[styles.countBadge, { color: theme.muted }]}>{countText}</Text>
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '650' as any,
    letterSpacing: -0.1,
  },
  countBadge: {
    fontSize: 11.5,
  },
  listCard: {
    flex: 1,
    borderRadius: 14,
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
    borderRadius: 9,
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
    borderRadius: 3,
    marginLeft: 2,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '650' as any,
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
});
