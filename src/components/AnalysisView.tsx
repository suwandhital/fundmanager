import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useLoans } from '../context/LoanContext';
import { useTheme } from '../theme/ThemeContext';
import { num, fmtDate } from '../utils/formatters';
import {
  ArrowDownRight,
  PieChart,
  Calendar,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react-native';

export const AnalysisView: React.FC = () => {
  const { transactions } = useTransactions();
  const { loans } = useLoans();
  const { theme, themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // ── 1. Comprehensive Calculations ──
  const analysis = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap: Record<string, { total: number; count: number }> = {};
    const monthlyMap: Record<
      string,
      {
        monthKey: string;
        label: string;
        income: number;
        expense: number;
        txCount: number;
        categories: Record<string, number>;
      }
    > = {};

    const expenseList: typeof transactions = [];

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        expenseList.push(t);

        const cat = t.category || 'Other';
        if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
        catMap[cat].total += amt;
        catMap[cat].count += 1;
      }

      // Group by Month (YYYY-MM)
      const dateParts = (t.date || '').split('-');
      if (dateParts.length >= 2) {
        const y = dateParts[0];
        const m = parseInt(dateParts[1], 10);
        const key = `${y}-${dateParts[1]}`;
        const label = `${monthNames[m - 1] || 'Month'} ${y}`;

        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            monthKey: key,
            label,
            income: 0,
            expense: 0,
            txCount: 0,
            categories: {},
          };
        }

        if (t.type === 'income') {
          monthlyMap[key].income += amt;
        } else {
          monthlyMap[key].expense += amt;
          const cat = t.category || 'Other';
          monthlyMap[key].categories[cat] = (monthlyMap[key].categories[cat] || 0) + amt;
        }
        monthlyMap[key].txCount += 1;
      }
    }

    // Sort Months Descending
    const months = Object.values(monthlyMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // Sort Categories Descending by Amount
    const categories = Object.entries(catMap)
      .map(([name, stat]) => ({
        name,
        total: stat.total,
        count: stat.count,
        percent: totalExpense > 0 ? (stat.total / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Top 5 Largest Outflows
    const topExpenses = [...expenseList].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)).slice(0, 5);

    // Net Savings Rate
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    // Financial Health Score (0 to 100)
    let score = 50;
    if (totalIncome > 0) {
      if (savingsRate >= 50) score += 40;
      else if (savingsRate >= 30) score += 30;
      else if (savingsRate >= 15) score += 20;
      else if (savingsRate > 0) score += 10;
      else score -= 20;
    }
    if (categories.length > 0 && categories[0].percent < 45) score += 10; // diversified spending
    score = Math.max(10, Math.min(99, score));

    // Debt analysis
    const toPayLoans = loans.filter(l => l.type === 'to_pay' && l.status === 'active');
    const toReceiveLoans = loans.filter(l => l.type === 'to_receive' && l.status === 'active');
    const activeDebtPrincipal = toPayLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);
    const activeReceivablePrincipal = toReceiveLoans.reduce((sum, l) => sum + (Number(l.principal) || 0), 0);

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      score,
      months,
      categories,
      topExpenses,
      activeDebtPrincipal,
      activeReceivablePrincipal,
      toPayCount: toPayLoans.length,
      toReceiveCount: toReceiveLoans.length,
    };
  }, [transactions, loans]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* ── 1. Executive Fund Manager Health Card ── */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Award size={15} color={theme.accent} strokeWidth={2.4} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>FUND MANAGER ASSESSMENT</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: analysis.score >= 80 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }]}>
            <Text style={[styles.scoreText, { color: analysis.score >= 80 ? theme.income : '#f59e0b' }]}>
              {analysis.score}/100 • {analysis.score >= 85 ? 'EXCELLENT' : analysis.score >= 70 ? 'HEALTHY' : 'NEEDS ATTENTION'}
            </Text>
          </View>
        </View>

        <Text style={[styles.summaryDescription, { color: theme.text }]}>
          Overall cash flow maintains a net surplus of{' '}
          <Text style={{ fontWeight: '700', color: analysis.netSavings >= 0 ? theme.income : theme.expense }}>
            NRS {Math.abs(analysis.netSavings).toLocaleString()}
          </Text>{' '}
          with a <Text style={{ fontWeight: '700' }}>{analysis.savingsRate}%</Text> capital retention rate.{' '}
          {analysis.categories.length > 0 && (
            <>
              Highest spending concentration is focused on{' '}
              <Text style={{ fontWeight: '700', color: theme.text }}>
                {analysis.categories[0].name} ({analysis.categories[0].percent.toFixed(1)}% of all outflows).
              </Text>
            </>
          )}
        </Text>

        {/* Quick Health Signals */}
        <View style={styles.signalsRow}>
          <View style={[styles.signalBox, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
            <Text style={[styles.signalLabel, { color: theme.muted }]}>SAVINGS RATIO</Text>
            <Text style={[styles.signalValue, { color: analysis.savingsRate >= 20 ? theme.income : theme.expense }]}>
              {analysis.savingsRate}%
            </Text>
          </View>

          <View style={[styles.signalBox, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
            <Text style={[styles.signalLabel, { color: theme.muted }]}>ACTIVE DEBT</Text>
            <Text style={[styles.signalValue, { color: theme.expense }]}>
              NRS {analysis.activeDebtPrincipal.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.signalBox, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
            <Text style={[styles.signalLabel, { color: theme.muted }]}>TO RECEIVE</Text>
            <Text style={[styles.signalValue, { color: theme.income }]}>
              NRS {analysis.activeReceivablePrincipal.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 2. Monthly Gain vs Spend Breakdown ── */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Calendar size={15} color={theme.accent} strokeWidth={2.4} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>MONTHLY GAIN & SPEND COMPARISON</Text>
          </View>
          <Text style={[styles.recordCountText, { color: theme.muted }]}>
            {analysis.months.length} Month{analysis.months.length === 1 ? '' : 's'}
          </Text>
        </View>

        {analysis.months.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No monthly transaction data recorded yet.</Text>
        ) : (
          <View style={styles.monthList}>
            {analysis.months.map(m => {
              const isExpanded = expandedMonth === m.monthKey;
              const net = m.income - m.expense;
              const totalMonthFlow = m.income + m.expense || 1;
              const incomeRatio = Math.round((m.income / totalMonthFlow) * 100);
              const expenseRatio = 100 - incomeRatio;

              return (
                <View key={m.monthKey} style={[styles.monthCard, { borderColor: theme.line, backgroundColor: theme.fieldBg }]}>
                  <TouchableOpacity
                    style={styles.monthHeader}
                    onPress={() => setExpandedMonth(isExpanded ? null : m.monthKey)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.monthLeft}>
                      <Text style={[styles.monthLabelText, { color: theme.text }]}>{m.label}</Text>
                      <Text style={[styles.monthSubText, { color: theme.muted }]}>
                        {m.txCount} transaction{m.txCount === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View style={styles.monthRight}>
                      <Text style={[styles.monthNetText, { color: net >= 0 ? theme.income : theme.expense }]}>
                        {net >= 0 ? '+' : '-'} NRS {Math.abs(net).toLocaleString()}
                      </Text>
                      {isExpanded ? <ChevronUp size={14} color={theme.muted} /> : <ChevronDown size={14} color={theme.muted} />}
                    </View>
                  </TouchableOpacity>

                  {/* Flow Distribution Bar */}
                  <View style={styles.flowBarContainer}>
                    <View style={[styles.flowBarSegment, { width: `${incomeRatio}%`, backgroundColor: theme.income }]} />
                    <View style={[styles.flowBarSegment, { width: `${expenseRatio}%`, backgroundColor: theme.expense }]} />
                  </View>

                  {/* Monthly Summary Badges */}
                  <View style={styles.monthNumbersRow}>
                    <View style={styles.monthStatItem}>
                      <Text style={[styles.statMicroLabel, { color: theme.muted }]}>GAINED (IN)</Text>
                      <Text style={[styles.monthStatVal, { color: theme.income }]}>+ {num(m.income)}</Text>
                    </View>
                    <View style={styles.monthStatItem}>
                      <Text style={[styles.statMicroLabel, { color: theme.muted }]}>SPENT (OUT)</Text>
                      <Text style={[styles.monthStatVal, { color: theme.expense }]}>- {num(m.expense)}</Text>
                    </View>
                    <View style={styles.monthStatItem}>
                      <Text style={[styles.statMicroLabel, { color: theme.muted }]}>SAVED %</Text>
                      <Text style={[styles.monthStatVal, { color: net >= 0 ? theme.text : theme.expense }]}>
                        {m.income > 0 ? `${Math.round((net / m.income) * 100)}%` : '0%'}
                      </Text>
                    </View>
                  </View>

                  {/* Expanded Category Breakdown for this specific month */}
                  {isExpanded && (
                    <View style={[styles.monthDetailsWrap, { borderTopColor: theme.line }]}>
                      <Text style={[styles.detailHeading, { color: theme.muted }]}>CATEGORIES IN {m.label.toUpperCase()}</Text>
                      {Object.entries(m.categories)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cName, cAmt]) => {
                          const pct = m.expense > 0 ? (cAmt / m.expense) * 100 : 0;
                          return (
                            <View key={cName} style={styles.monthCatRow}>
                              <Text style={[styles.monthCatName, { color: theme.text }]}>{cName}</Text>
                              <View style={styles.monthCatRight}>
                                <Text style={[styles.monthCatPct, { color: theme.muted }]}>{pct.toFixed(0)}%</Text>
                                <Text style={[styles.monthCatAmt, { color: theme.expense }]}>- {num(cAmt)}</Text>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── 3. High Spending Analysis (Where Money Goes) ── */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <PieChart size={15} color={theme.accent} strokeWidth={2.4} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>EXPENDITURE RANKING & BREAKDOWN</Text>
          </View>
          <Text style={[styles.recordCountText, { color: theme.muted }]}>All Outflows</Text>
        </View>

        {analysis.categories.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.muted }]}>No expense transactions found.</Text>
        ) : (
          <View style={styles.categoryList}>
            {analysis.categories.map((c, idx) => {
              const maxSpend = analysis.categories[0]?.total || 1;
              const relativeBarWidth = Math.max(6, Math.round((c.total / maxSpend) * 100));

              return (
                <View key={c.name} style={styles.categoryItem}>
                  <View style={styles.catTopRow}>
                    <View style={styles.catRankTitle}>
                      <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? 'rgba(239,68,68,0.18)' : theme.fieldBg }]}>
                        <Text style={[styles.rankText, { color: idx === 0 ? theme.expense : theme.muted }]}>#{idx + 1}</Text>
                      </View>
                      <Text style={[styles.catNameText, { color: theme.text }]}>{c.name}</Text>
                      <Text style={[styles.catCountText, { color: theme.muted }]}>({c.count} tx)</Text>
                    </View>

                    <View style={styles.catAmountRow}>
                      <Text style={[styles.catPctBadge, { color: theme.muted }]}>{c.percent.toFixed(1)}%</Text>
                      <Text style={[styles.catAmountText, { color: theme.text }]}>NRS {c.total.toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Relative Spending Bar */}
                  <View style={[styles.catBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          width: `${relativeBarWidth}%`,
                          backgroundColor: idx === 0 ? theme.expense : idx === 1 ? '#f59e0b' : theme.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── 4. Highest Individual Outflows ── */}
      {analysis.topExpenses.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }]}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <ArrowDownRight size={15} color={theme.expense} strokeWidth={2.4} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>TOP SINGLE EXPENSES</Text>
            </View>
            <Text style={[styles.recordCountText, { color: theme.muted }]}>Highest Outflows</Text>
          </View>

          <View style={styles.topExpenseList}>
            {analysis.topExpenses.map((t, idx) => (
              <View
                key={t.id}
                style={[
                  styles.topExpenseRow,
                  idx < analysis.topExpenses.length - 1 && [styles.topExpenseBorder, { borderBottomColor: theme.line }],
                ]}
              >
                <View style={styles.topExpenseLeft}>
                  <Text style={[styles.topExpenseNote, { color: theme.text }]} numberOfLines={1}>
                    {t.note || t.category}
                  </Text>
                  <Text style={[styles.topExpenseMeta, { color: theme.muted }]}>
                    {fmtDate(t.date)} • {t.category}
                  </Text>
                </View>
                <Text style={[styles.topExpenseAmt, { color: theme.expense }]}>
                  - {num(t.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── 5. Fund Manager Rules & Strategic Advice ── */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.line }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <CheckCircle2 size={15} color={theme.income} strokeWidth={2.4} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>ACTIONABLE WEALTH DIRECTIVES</Text>
          </View>
        </View>

        <View style={styles.directiveList}>
          <View style={styles.directiveItem}>
            <Text style={[styles.directiveNum, { color: theme.accent }]}>01</Text>
            <Text style={[styles.directiveText, { color: theme.text }]}>
              {analysis.categories.length > 0
                ? `Limit discretionary spending in "${analysis.categories[0].name}". It accounts for ${analysis.categories[0].percent.toFixed(0)}% of your expenses.`
                : 'Maintain detailed category records to identify unnecessary drains on capital.'}
            </Text>
          </View>

          <View style={styles.directiveItem}>
            <Text style={[styles.directiveNum, { color: theme.accent }]}>02</Text>
            <Text style={[styles.directiveText, { color: theme.text }]}>
              {analysis.activeDebtPrincipal > 0
                ? `You have NRS ${analysis.activeDebtPrincipal.toLocaleString()} in active debt to pay. Prioritize high-interest liabilities first to prevent accrued drag.`
                : 'Zero active debt detected. Excellent liability management! Maintain zero interest burden.'}
            </Text>
          </View>

          <View style={styles.directiveItem}>
            <Text style={[styles.directiveNum, { color: theme.accent }]}>03</Text>
            <Text style={[styles.directiveText, { color: theme.text }]}>
              Aim to retain at least 30% of monthly inflows. Your current retention rate is{' '}
              <Text style={{ fontWeight: '700', color: analysis.savingsRate >= 30 ? theme.income : '#f59e0b' }}>
                {analysis.savingsRate}%
              </Text>.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 90,
    gap: 10,
    paddingTop: 4,
  },
  card: {
    borderRadius: 0,
    borderWidth: 1,
    padding: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  scoreBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 0,
  },
  scoreText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  recordCountText: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryDescription: {
    fontSize: 13,
    lineHeight: 18.5,
    marginBottom: 10,
  },
  signalsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  signalBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 0,
    padding: 8,
    alignItems: 'center',
  },
  signalLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  signalValue: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 12.5,
    paddingVertical: 12,
    textAlign: 'center',
  },
  monthList: {
    gap: 8,
  },
  monthCard: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 10,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLeft: {
    flex: 1,
  },
  monthLabelText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  monthSubText: {
    fontSize: 10.5,
    marginTop: 1,
  },
  monthRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthNetText: {
    fontSize: 13,
    fontWeight: '700',
  },
  flowBarContainer: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 0,
    overflow: 'hidden',
    marginVertical: 8,
  },
  flowBarSegment: {
    height: '100%',
  },
  monthNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  monthStatItem: {
    alignItems: 'flex-start',
  },
  statMicroLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  monthStatVal: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  monthDetailsWrap: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
    gap: 4,
  },
  detailHeading: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  monthCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  monthCatName: {
    fontSize: 12,
    fontWeight: '500',
  },
  monthCatRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthCatPct: {
    fontSize: 10.5,
  },
  monthCatAmt: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  categoryList: {
    gap: 10,
    paddingTop: 2,
  },
  categoryItem: {
    gap: 4,
  },
  catTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catRankTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankBadge: {
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 0,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  catCountText: {
    fontSize: 10.5,
  },
  catAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  catPctBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  catAmountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  catBarTrack: {
    height: 3,
    borderRadius: 0,
    overflow: 'hidden',
    width: '100%',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 0,
  },
  topExpenseList: {
    paddingTop: 2,
  },
  topExpenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  topExpenseBorder: {
    borderBottomWidth: 1,
  },
  topExpenseLeft: {
    flex: 1,
    marginRight: 10,
  },
  topExpenseNote: {
    fontSize: 13,
    fontWeight: '600',
  },
  topExpenseMeta: {
    fontSize: 10.5,
    marginTop: 2,
  },
  topExpenseAmt: {
    fontSize: 13,
    fontWeight: '700',
  },
  directiveList: {
    gap: 8,
    paddingTop: 2,
  },
  directiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  directiveNum: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  directiveText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
  },
});
