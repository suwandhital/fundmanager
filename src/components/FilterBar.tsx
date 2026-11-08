import React from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { TypeFilter } from '../types';
import { Search, X } from 'lucide-react-native';

const CHIPS: { key: TypeFilter; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'income',  label: 'In'  },
  { key: 'expense', label: 'Out' },
];

export const FilterBar: React.FC = () => {
  const { search, setSearch, typeFilter, setTypeFilter } = useTransactions();
  const { theme } = useTheme();

  return (
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
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
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
    outlineStyle: 'none' as any,
  },
  chips: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
    flexShrink: 0,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 7,
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
