import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Loan, LoanType } from '../types';
import { useLoans } from '../context/LoanContext';
import { useTheme } from '../theme/ThemeContext';
import { money, fmtDate } from '../utils/formatters';
import { calculateLoanDetails } from '../utils/loanCalculations';
import {
  Search,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';

interface LoanListProps {
  type: LoanType;
  onSelectLoan: (loan: Loan) => void;
}

type StatusFilter = 'all' | 'active' | 'settled';

export const LoanList: React.FC<LoanListProps> = ({ type, onSelectLoan }) => {
  const { toPayLoans, toReceiveLoans } = useLoans();
  const { theme, themeMode } = useTheme();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const rawList = type === 'to_pay' ? toPayLoans : toReceiveLoans;
  const isToPay = type === 'to_pay';
  const isDark = themeMode === 'dark';

  const filteredLoans = useMemo(() => {
    let result = rawList;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        l =>
          l.person.toLowerCase().includes(q) ||
          (l.note && l.note.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q))
      );
    }

    return result;
  }, [rawList, statusFilter, search]);

  const renderLoanCard = ({ item }: { item: Loan }) => {
    const details = calculateLoanDetails(item);
    const isSettled = item.status === 'settled';

    // Calculate percentage paid of original principal
    const percentPaid =
      item.principal > 0
        ? Math.min(100, Math.round((details.totalPrincipalPaid / item.principal) * 100))
        : 100;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isSettled ? theme.line : themeMode === 'dark' ? '#263346' : '#e2e8f0',
          },
        ]}
        onPress={() => onSelectLoan(item)}
        activeOpacity={0.75}
      >
        {/* Top Header: Person + Status Pill */}
        <View style={styles.cardHeader}>
          <View style={styles.personBlock}>
            <Text style={[styles.personName, { color: theme.text }]} numberOfLines={1}>
              {item.person}
            </Text>
            {item.note ? (
              <Text style={[styles.loanNote, { color: theme.muted }]} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isSettled
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isToPay
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(59, 130, 246, 0.12)',
              },
            ]}
          >
            {isSettled ? (
              <CheckCircle2 size={11} color="#10b981" strokeWidth={2.4} style={{ marginRight: 3 }} />
            ) : (
              <AlertCircle size={11} color={isToPay ? '#ef4444' : '#3b82f6'} strokeWidth={2.4} style={{ marginRight: 3 }} />
            )}
            <Text
              style={[
                styles.statusText,
                { color: isSettled ? '#10b981' : isToPay ? '#ef4444' : '#3b82f6' },
              ]}
            >
              {isSettled ? 'Settled' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Rate & Meta Badges */}
        <View style={styles.badgeRow}>
          {item.interestType === 'none' ? (
            <View style={[styles.metaPill, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <Text style={[styles.metaPillText, { color: theme.muted }]}>0% Interest Free</Text>
            </View>
          ) : (
            <View style={[styles.metaPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <TrendingUp size={10} color="#f59e0b" strokeWidth={2.4} style={{ marginRight: 3 }} />
              <Text style={[styles.metaPillText, { color: '#f59e0b', fontWeight: '700' }]}>
                {item.interestRate}% / {item.interestType === 'monthly' ? 'month' : 'year'}
              </Text>
            </View>
          )}

          <View style={[styles.metaPill, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
            <Calendar size={10} color={theme.muted} strokeWidth={2} style={{ marginRight: 3 }} />
            <Text style={[styles.metaPillText, { color: theme.muted }]}>
              {fmtDate(item.startDate)} • {details.elapsedDays}d
            </Text>
          </View>
        </View>

        {/* Financial Numbers Grid */}
        <View style={[styles.numbersGrid, { backgroundColor: theme.fieldBg }]}>
          <View style={styles.gridCol}>
            <Text style={[styles.gridLabel, { color: theme.muted }]}>Remaining Principal</Text>
            <Text style={[styles.gridVal, { color: theme.text }]} numberOfLines={1}>
              {money(details.remainingPrincipal)}
            </Text>
          </View>

          {item.interestType !== 'none' && (
            <View style={styles.gridCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={10} color="#f59e0b" strokeWidth={2} style={{ marginRight: 2 }} />
                <Text style={[styles.gridLabel, { color: '#f59e0b' }]}>Unpaid Interest</Text>
              </View>
              <Text style={[styles.gridVal, { color: '#f59e0b' }]} numberOfLines={1}>
                +{money(details.unpaidInterest)}
              </Text>
            </View>
          )}

          <View style={[styles.gridCol, { alignItems: 'flex-end' }]}>
            <Text style={[styles.gridLabel, { color: theme.muted }]}>
              {isToPay ? 'Total to Pay' : 'Total to Receive'}
            </Text>
            <Text
              style={[
                styles.gridVal,
                { color: isSettled ? '#10b981' : isToPay ? theme.expense : theme.income, fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              {money(details.totalOutstanding)}
            </Text>
          </View>
        </View>

        {/* Minimal Progress Bar of Principal Repaid */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentPaid}%`,
                  backgroundColor: isSettled ? '#10b981' : isToPay ? theme.expense : theme.income,
                },
              ]}
            />
          </View>
        </View>

        {/* Footer: Repayments Count + Action chevron */}
        <View style={styles.cardFooter}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            {item.payments && item.payments.length > 0
              ? `${item.payments.length} payment${item.payments.length > 1 ? 's' : ''} • ${percentPaid}% repaid`
              : 'No payments recorded'}
          </Text>

          <View style={styles.viewDetailsRow}>
            <Text style={[styles.viewDetailsText, { color: theme.accent }]}>Manage</Text>
            <ChevronRight size={13} color={theme.accent} strokeWidth={2.4} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Search & Status Filters */}
      <View style={styles.controlsRow}>
        {/* Search Input */}
        <View style={[styles.searchBox, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}>
          <Search size={14} color={theme.muted} strokeWidth={2} style={{ marginRight: 6 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${isToPay ? 'lenders' : 'borrowers'}...`}
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={theme.muted} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Chips */}
        <View style={styles.chipRow}>
          {(['all', 'active', 'settled'] as StatusFilter[]).map(s => {
            const isActive = statusFilter === s;
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? theme.text : theme.fieldBg,
                    borderColor: isActive ? theme.text : theme.line,
                  },
                ]}
                onPress={() => setStatusFilter(s)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? theme.card : theme.muted,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Settled'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Loans FlatList */}
      <FlatList
        data={filteredLoans}
        keyExtractor={item => item.id}
        renderItem={renderLoanCard}
        contentContainerStyle={[styles.listContent, filteredLoans.length === 0 && styles.listEmptyContainer]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.fieldBg }]}>
              <AlertCircle size={28} color={theme.muted} strokeWidth={1.8} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {search
                ? 'No matching loans found'
                : statusFilter === 'settled'
                ? 'No settled loans yet'
                : isToPay
                ? 'No active loans to pay'
                : 'No active loans to receive'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.muted }]}>
              {isToPay
                ? 'Add borrowed loans using the + button below.'
                : 'Add money you have lent to others using the + button below.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  controlsRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 0,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 80,
    gap: 10,
    paddingTop: 4,
  },
  listEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 0,
    padding: 13,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  personBlock: {
    flex: 1,
    marginRight: 8,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  loanNote: {
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 0,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
  },
  metaPillText: {
    fontSize: 10,
  },
  numbersGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 9,
    borderRadius: 0,
    marginVertical: 4,
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 4,
    marginBottom: 2,
  },
  progressTrack: {
    height: 2.5,
    borderRadius: 0,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 11,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});

