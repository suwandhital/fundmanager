import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLoans } from '../context/LoanContext';
import { useTheme } from '../theme/ThemeContext';
import { num, money } from '../utils/formatters';
import { LoanType } from '../types';
import { ArrowDownLeft, ArrowUpRight, Clock, Users } from 'lucide-react-native';

interface LoanSummaryCardProps {
  type: LoanType;
}

export const LoanSummaryCard: React.FC<LoanSummaryCardProps> = ({ type }) => {
  const { toPayTotals, toReceiveTotals } = useLoans();
  const { themeMode } = useTheme();

  const isDark = themeMode === 'dark';
  const totals = type === 'to_pay' ? toPayTotals : toReceiveTotals;
  const isToPay = type === 'to_pay';

  const badgeColor = isToPay ? '#f87171' : '#4ade80';
  const badgeBg = isToPay ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)';

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
      {/* Top row: Section title & Active badge */}
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconBox, { backgroundColor: badgeBg }]}>
            {isToPay ? (
              <ArrowDownLeft size={14} color={badgeColor} strokeWidth={2.5} />
            ) : (
              <ArrowUpRight size={14} color={badgeColor} strokeWidth={2.5} />
            )}
          </View>
          <Text style={styles.topLabel}>
            {isToPay ? 'Total Debt to Pay' : 'Total to Receive'}
          </Text>
        </View>

        <View style={[styles.pill, { backgroundColor: badgeBg }]}>
          <Users size={11} color={badgeColor} strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={[styles.pillText, { color: badgeColor }]}>
            {totals.activeCount} Active
          </Text>
        </View>
      </View>

      {/* Primary Balance: Total Outstanding */}
      <View style={styles.amountBlock}>
        <Text style={styles.currencyPrefix}>NRS</Text>
        <Text style={[styles.amountValue, { color: isToPay ? '#fca5a5' : '#86efac' }]} numberOfLines={1}>
          {num(totals.totalOutstanding)}
        </Text>
      </View>

      {/* Metrics Row: Remaining Principal | Counting Interest | Settled Count */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Principal</Text>
          <Text style={[styles.metricVal, { color: '#e2e8f0' }]} numberOfLines={1}>
            {money(totals.totalPrincipal)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metric}>
          <View style={styles.interestLabelRow}>
            <Clock size={10} color="#fbbf24" strokeWidth={2.2} style={{ marginRight: 3 }} />
            <Text style={styles.metricLabel}>Counting Interest</Text>
          </View>
          <Text style={[styles.metricVal, { color: '#fde047' }]} numberOfLines={1}>
            +{money(totals.totalInterest)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Settled</Text>
          <Text style={[styles.metricVal, { color: '#94a3b8' }]} numberOfLines={1}>
            {totals.settledCount} Loans
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 0,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginVertical: 4,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metric: {
    flex: 1,
  },
  interestLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
});
