import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { num, money, PERIOD_LABELS } from '../utils/formatters';
import { ArrowUp, ArrowDown } from 'lucide-react-native';

export const BalanceCard: React.FC = () => {
  const { balance, periodData, period } = useTransactions();
  const { themeMode } = useTheme();

  const isDark = themeMode === 'dark';
  const isNegative = balance < 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#151b28' : '#0f172a',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
        },
      ]}
    >
      {/* Top row: label + period pill + balance all in one row */}
      <View style={styles.topRow}>
        <View style={styles.balanceBlock}>
          <Text style={styles.topLabel}>Total Balance</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencyPrefix}>NRS</Text>
            <Text
              style={[styles.amountValue, isNegative && styles.amountNegative]}
              numberOfLines={1}
            >
              {num(balance)}
            </Text>
          </View>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{PERIOD_LABELS[period]}</Text>
        </View>
      </View>

      {/* Metrics in one row */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <View style={styles.metricHead}>
            <View style={[styles.iconBox, styles.incomeBox]}>
              <ArrowUp size={11} color="#4ade80" strokeWidth={2.4} />
            </View>
            <Text style={styles.metricLabel}>Income</Text>
          </View>
          <Text style={[styles.metricVal, styles.incomeText]} numberOfLines={1}>
            {money(periodData.totalIncome)}
          </Text>
        </View>

        <View style={[styles.metricDivider]} />

        <View style={styles.metric}>
          <View style={styles.metricHead}>
            <View style={[styles.iconBox, styles.expenseBox]}>
              <ArrowDown size={11} color="#f87171" strokeWidth={2.4} />
            </View>
            <Text style={styles.metricLabel}>Expense</Text>
          </View>
          <Text style={[styles.metricVal, styles.expenseText]} numberOfLines={1}>
            {money(periodData.totalExpense)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceBlock: {
    flex: 1,
    minWidth: 0,
  },
  topLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 3,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  currencyPrefix: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.4,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  amountNegative: {
    color: '#f87171',
  },
  pill: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginLeft: 8,
    flexShrink: 0,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  metric: {
    flex: 1,
    padding: 10,
    gap: 4,
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 8,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeBox: {
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  expenseBox: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  incomeText: {
    color: '#4ade80',
  },
  expenseText: {
    color: '#f87171',
  },
});
