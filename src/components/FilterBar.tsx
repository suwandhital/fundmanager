import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { TypeFilter } from '../types';
import { Search, X, Calendar } from 'lucide-react-native';

const CHIPS: { key: TypeFilter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'income',  label: 'In'  },
  { key: 'expense', label: 'Out' },
];

export const FilterBar: React.FC = () => {
  const { search, setSearch, typeFilter, setTypeFilter, fromDate, toDate, clearDates } = useTransactions();
  const { theme } = useTheme();

  const hasDateFilter = !!(fromDate || toDate);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Search */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: theme.fieldBg, borderColor: theme.line },
          ]}
        >
          <Search size={14} color={theme.muted} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search…"
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={13} color={theme.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type chips */}
        <View style={[styles.chips, { backgroundColor: theme.track }]}>
          {CHIPS.map(({ key, label }) => {
            const active = typeFilter === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.chip,
                  active && [styles.chipActive, { backgroundColor: theme.raised }],
                ]}
                onPress={() => setTypeFilter(key)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? theme.text : theme.muted },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Active Chart Drag Filter Pill */}
      {hasDateFilter && (
        <View style={styles.dateFilterRow}>
          <TouchableOpacity
            style={[styles.datePill, { backgroundColor: theme.fieldBg, borderColor: theme.line }]}
            onPress={clearDates}
            activeOpacity={0.75}
          >
            <Calendar size={12} color={theme.text} strokeWidth={2} />
            <Text style={[styles.datePillText, { color: theme.text }]}>
              {fromDate && toDate ? `${fromDate}  →  ${toDate}` : fromDate ? `From ${fromDate}` : `Up to ${toDate}`}
            </Text>
            <View style={[styles.dateClearIcon, { backgroundColor: theme.track }]}>
              <X size={10} color={theme.text} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 0,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateClearIcon: {
    width: 16,
    height: 16,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    gap: 7,
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  chips: {
    flexDirection: 'row',
    borderRadius: 0,
    padding: 3,
    gap: 2,
    flexShrink: 0,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
