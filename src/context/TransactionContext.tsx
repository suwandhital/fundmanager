import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Period, TypeFilter, PeriodData, PeriodBucket, BackupData } from '../types';
import { useAuth, apiFetchWithTimeout } from './AuthContext';
import { useToast } from './ToastContext';
import { uid, sanitizeAmount, sanitizeString } from '../utils/crypto';
import { ymd, txDatetime, fmtDate, fmtTime } from '../utils/formatters';
import { seedDemoTransactions, migrateTx } from '../utils/sampleData';

const KEY_TX = (uid: string) => `fm.tx.${uid}`;

interface TransactionContextType {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  isLoading: boolean;
  isSyncing: boolean;
  unsyncedCount: number;
  period: Period;
  search: string;
  typeFilter: TypeFilter;
  fromDate: string;
  toDate: string;
  periodData: PeriodData;
  balance: number;
  // State setters
  setPeriod: (p: Period) => void;
  setSearch: (s: string) => void;
  setTypeFilter: (t: TypeFilter) => void;
  setFromDate: (d: string) => void;
  setToDate: (d: string) => void;
  clearDates: () => void;
  // CRUD
  saveTransaction: (input: {
    id?: string | null;
    type: 'income' | 'expense';
    amount: number | string;
    note: string;
    category: string;
    date: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteTransaction: (id: string) => Promise<boolean>;
  // Sync & maintenance
  syncNow: (silent?: boolean) => Promise<void>;
  reloadSampleData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  exportBackup: () => BackupData | null;
  importBackup: (backup: BackupData) => Promise<{ success: boolean; count?: number; error?: string }>;
  isExporting: boolean;
  emailStatement: (customEmail?: string) => Promise<{ success: boolean; previewUrl?: string; message?: string; error?: string }>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [period, setPeriod] = useState<Period>('day');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Load transactions whenever user changes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) {
        if (isMounted) {
          setTransactions([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Read local storage (checking user.id and user.email for seamless offline/online continuity)
        let raw = await AsyncStorage.getItem(KEY_TX(user.id));
        if (!raw && user.email) {
          raw = await AsyncStorage.getItem(KEY_TX(user.email));
        }
        if (!isMounted) return;

        let list: Transaction[] = [];
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              list = parsed.map(migrateTx);
            }
          } catch {
            list = [];
          }
        }

        // If demo user has empty transactions, seed realistic data
        if (list.length === 0 && user.email === 'demo@fund.local') {
          list = seedDemoTransactions();
          const json = JSON.stringify(list);
          await AsyncStorage.setItem(KEY_TX(user.id), json).catch(() => {});
          if (user.email) await AsyncStorage.setItem(KEY_TX(user.email), json).catch(() => {});
        }

        list.sort((a, b) => b.time - a.time);
        if (isMounted) {
          setTransactions(list);
          // Cached transactions loaded from disk — allow screen to display immediately
          setIsLoading(false);
        }

        // Demo user operates 100% locally on device
        if (user.email === 'demo@fund.local') return;

        // Fetch from MongoDB Atlas in background and merge
        const queryUrl = `/api/transactions?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`;
        apiFetchWithTimeout<{ transactions: Transaction[] }>(
          queryUrl,
          undefined,
          8000
        )
          .then(async ({ data }) => {
            if (!isMounted || !data?.transactions) return;
            const remoteList = data.transactions.map(migrateTx);
            if (remoteList.length > 0) {
              // Merge remote and local by id
              const map = new Map<string, Transaction>();
              for (const r of remoteList) map.set(r.id, r);
              for (const l of list) {
                // Keep local if local has newer unsynced changes
                if (!l.synced || !map.has(l.id)) {
                  map.set(l.id, l);
                } else {
                  const rem = map.get(l.id)!;
                  if ((l.updatedAt || l.time || 0) > (rem.updatedAt || rem.time || 0)) {
                    map.set(l.id, l);
                  }
                }
              }
              const merged = Array.from(map.values()).sort((a, b) => b.time - a.time);
              if (isMounted) {
                setTransactions(merged);
              }
              const json = JSON.stringify(merged);
              await AsyncStorage.setItem(KEY_TX(user.id), json).catch(() => {});
              if (user.email) await AsyncStorage.setItem(KEY_TX(user.email), json).catch(() => {});
            } else if (list.length > 0) {
              // Local has data but remote is empty — sync local up to MongoDB Atlas
              apiFetchWithTimeout('/api/sync', {
                userId: user.id,
                email: user.email,
                transactions: list,
              }, 8000).catch(() => {});
            }
          })
          .catch(() => {});
      } catch (err) {
        console.error('Failed to load transactions:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Persist helper
  const persist = useCallback(async (list: Transaction[]) => {
    if (!user) return;
    try {
      const json = JSON.stringify(list);
      await AsyncStorage.setItem(KEY_TX(user.id), json);
      if (user.email) {
        await AsyncStorage.setItem(KEY_TX(user.email), json).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to persist transactions:', err);
    }
  }, [user]);

  // Balance calculation: all income minus all expense
  const balance = useMemo(() => {
    let allIn = 0;
    let allOut = 0;
    for (const t of transactions) {
      if (t.type === 'income') allIn += t.amount;
      else allOut += t.amount;
    }
    return allIn - allOut;
  }, [transactions]);

  // Unsynced count
  const unsyncedCount = useMemo(() => {
    return transactions.filter(t => !t.synced).length;
  }, [transactions]);

  // Period data computation matching exact user's hourly Day buckets, Week, Month, and Year
  const periodData = useMemo<PeriodData>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayYmd = ymd(now);
    let buckets: PeriodBucket[] = [];

    if (period === 'day') {
      // 24 hourly buckets
      buckets = [];
      for (let h = 0; h < 24; h++) {
        let label = '';
        if (h % 4 === 0) {
          const ampm = h < 12 ? 'a' : 'p';
          const h12 = h % 12 || 12;
          label = `${h12}${ampm}`;
        }
        buckets.push({ label, income: 0, expense: 0 });
      }

      for (const t of transactions) {
        if (t.date !== todayYmd) continue;
        const h = new Date(t.createdAt).getHours();
        if (h >= 0 && h < 24) {
          buckets[h][t.type] += t.amount;
        }
      }
    } else if (period === 'week') {
      const start = new Date(y, m, now.getDate());
      const dow = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dow);
      const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      buckets = labels.map(l => ({ label: l, income: 0, expense: 0 }));

      for (const t of transactions) {
        const txDay = new Date(t.time);
        const txMs = new Date(txDay.getFullYear(), txDay.getMonth(), txDay.getDate()).getTime();
        const idx = Math.round((txMs - startMs) / 86400000);
        if (idx >= 0 && idx < 7) {
          buckets[idx][t.type] += t.amount;
        }
      }
    } else if (period === 'month') {
      const days = new Date(y, m + 1, 0).getDate();
      const weeks = Math.ceil(days / 7);
      buckets = [];
      for (let i = 0; i < weeks; i++) {
        buckets.push({ label: 'W' + (i + 1), income: 0, expense: 0 });
      }

      for (const t of transactions) {
        const txDay = new Date(t.time);
        if (txDay.getFullYear() !== y || txDay.getMonth() !== m) continue;
        const idx = Math.floor((txDay.getDate() - 1) / 7);
        if (idx >= 0 && idx < weeks) {
          buckets[idx][t.type] += t.amount;
        }
      }
    } else {
      // Year: 12 months
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      buckets = labels.map(l => ({ label: l, income: 0, expense: 0 }));

      for (const t of transactions) {
        const txDay = new Date(t.time);
        if (txDay.getFullYear() !== y) continue;
        buckets[txDay.getMonth()][t.type] += t.amount;
      }
    }

    let totalIncome = 0;
    let totalExpense = 0;
    for (const b of buckets) {
      totalIncome += b.income;
      totalExpense += b.expense;
    }

    return { buckets, totalIncome, totalExpense };
  }, [transactions, period]);

  // Filtering transactions matching user's matchSearch logic
  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: Transaction[] = [];

    for (const t of transactions) {
      if (typeFilter !== 'all' && t.type !== typeFilter) continue;
      if (fromDate && t.date < fromDate) continue;
      if (toDate && t.date > toDate) continue;

      if (q) {
        const hay = [
          t.note || '',
          t.category,
          String(t.amount),
          t.date,
          fmtDate(t.date),
          fmtTime(t.createdAt),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) continue;
      }

      out.push(t);
    }

    out.sort((a, b) => b.time - a.time);
    return out;
  }, [transactions, search, typeFilter, fromDate, toDate]);

  // Save (Create or Update)
  const saveTransaction = useCallback(async (input: {
    id?: string | null;
    type: 'income' | 'expense';
    amount: number | string;
    note: string;
    category: string;
    date: string;
  }) => {
    const cleanAmount = sanitizeAmount(input.amount);
    if (!cleanAmount) {
      return { success: false, error: 'Enter a valid amount' };
    }

    const cleanDate = input.date || ymd(new Date());
    const cleanNote = sanitizeString(input.note, 60);
    const cleanCat = sanitizeString(input.category || (input.type === 'income' ? 'Salary' : 'Other'), 40);

    const isEditing = !!input.id;
    let updatedList: Transaction[] = [];

    if (isEditing) {
      const existing = transactions.find(t => t.id === input.id);
      if (!existing) return { success: false, error: 'Transaction not found' };

      const updatedItem: Transaction = {
        ...existing,
        type: input.type,
        amount: cleanAmount,
        note: cleanNote,
        category: cleanCat,
        date: cleanDate,
        updatedAt: Date.now(),
        synced: false,
      };
      updatedItem.time = txDatetime(updatedItem);

      updatedList = transactions.map(t => (t.id === input.id ? updatedItem : t));
    } else {
      const now = Date.now();
      const newItem: Transaction = {
        id: uid(),
        type: input.type,
        amount: cleanAmount,
        note: cleanNote,
        category: cleanCat,
        date: cleanDate,
        createdAt: now,
        updatedAt: now,
        time: txDatetime({ date: cleanDate, createdAt: now }),
        synced: false,
      };
      updatedList = [newItem, ...transactions];
    }

    updatedList.sort((a, b) => b.time - a.time);
    setTransactions(updatedList);
    await persist(updatedList);

    // Auto-sync immediately to MongoDB Atlas in background
    if (user && user.email !== 'demo@fund.local') {
      const itemToSync = isEditing
        ? updatedList.find(t => t.id === input.id)
        : updatedList[0];

      if (itemToSync) {
        apiFetchWithTimeout<{ success: boolean }>(
          '/api/sync',
          { userId: user.id, email: user.email, transactions: [itemToSync] },
          8000
        )
          .then(({ data }) => {
            if (data?.success) {
              setTransactions(prev => {
                const marked = prev.map(t =>
                  t.id === itemToSync.id ? { ...t, synced: true } : t
                );
                persist(marked);
                return marked;
              });
            }
          })
          .catch(() => {});
      }
    }

    toast(isEditing ? 'Transaction updated' : 'Transaction added');
    return { success: true };
  }, [transactions, persist, toast, user]);

  // Delete
  const deleteTransaction = useCallback(async (id: string) => {
    const updatedList = transactions.filter(t => t.id !== id);
    setTransactions(updatedList);
    await persist(updatedList);

    // Auto-delete from MongoDB Atlas in background
    if (user && user.email !== 'demo@fund.local') {
      const delUrl = `/api/transactions/${encodeURIComponent(id)}?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`;
      apiFetchWithTimeout(delUrl, undefined, 8000, 'DELETE').catch(() => {});
    }

    toast('Transaction deleted');
    return true;
  }, [transactions, persist, toast, user]);

  // Clear dates
  const clearDates = useCallback(() => {
    setFromDate('');
    setToDate('');
  }, []);

  // Sync with MongoDB Atlas (two-way merge: pulls remote + pushes local)
  const syncNow = useCallback(async (silent = false) => {
    if (!user) {
      if (!silent) toast('Please login to sync');
      return;
    }

    if (user.email === 'demo@fund.local') {
      if (!silent) toast('Demo account runs locally. Register or login to sync with cloud.');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Fetch remote transactions from MongoDB Atlas
      const queryUrl = `/api/transactions?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`;
      const { data: remoteData, error: fetchError } = await apiFetchWithTimeout<{ transactions: Transaction[] }>(
        queryUrl,
        undefined,
        8000
      );

      let workingList = [...transactions];
      if (remoteData?.transactions) {
        const remoteList = remoteData.transactions.map(migrateTx);
        const map = new Map<string, Transaction>();
        for (const r of remoteList) map.set(r.id, r);
        for (const l of workingList) {
          if (!l.synced || !map.has(l.id)) {
            map.set(l.id, l);
          } else {
            const rem = map.get(l.id)!;
            if ((l.updatedAt || l.time || 0) > (rem.updatedAt || rem.time || 0)) {
              map.set(l.id, l);
            }
          }
        }
        workingList = Array.from(map.values()).sort((a, b) => b.time - a.time);
      }

      // 2. Push all transactions to MongoDB Atlas
      if (workingList.length > 0) {
        const { data, error: syncError } = await apiFetchWithTimeout<{ success: boolean; count: number }>(
          '/api/sync',
          { userId: user.id, email: user.email, transactions: workingList },
          10000
        );

        if (data?.success) {
          const synced = workingList.map(t => ({ ...t, synced: true }));
          setTransactions(synced);
          await persist(synced);
          if (!silent) toast(`Synced ${workingList.length} transaction${workingList.length > 1 ? 's' : ''} to MongoDB Atlas ✓`);
          return;
        } else {
          if (!silent) toast(syncError || fetchError || 'Sync failed — check connection');
          return;
        }
      } else {
        if (!silent) toast('No transactions to sync');
      }
    } catch (err: any) {
      if (!silent) toast(err?.message || 'Sync failed — check connection');
    } finally {
      setTimeout(() => setIsSyncing(false), 300);
    }
  }, [transactions, user, persist, toast]);

  // Reload sample data
  const reloadSampleData = useCallback(async () => {
    const sample = seedDemoTransactions().map(migrateTx);
    setTransactions(sample);
    await persist(sample);
    toast(`Sample data reloaded · ${sample.length} transactions`);
  }, [persist, toast]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    if (!transactions.length) {
      toast('Nothing to clear');
      return;
    }
    setTransactions([]);
    await persist([]);
    toast('All transactions cleared');
  }, [transactions.length, persist, toast]);

  // Export backup
  const exportBackup = useCallback((): BackupData | null => {
    if (!user || transactions.length === 0) return null;
    return {
      app: 'fund',
      version: 6,
      currency: 'NRS',
      exportedAt: new Date().toISOString(),
      user: user.email,
      transactions,
    };
  }, [user, transactions]);

  // Import backup
  const importBackup = useCallback(async (backup: BackupData) => {
    if (!backup || !Array.isArray(backup.transactions)) {
      return { success: false, error: 'Invalid backup file format' };
    }

    const imported = backup.transactions.map(migrateTx);
    imported.sort((a, b) => b.time - a.time);
    setTransactions(imported);
    await persist(imported);
    toast(`Imported ${imported.length} transactions`);
    return { success: true, count: imported.length };
  }, [persist, toast]);

  // Export active filtered statement to email via PDF
  const [isExporting, setIsExporting] = useState(false);

  const emailStatement = useCallback(async (customEmail?: string) => {
    const targetEmail = (customEmail || user?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      toast('Please enter a valid email address');
      return { success: false, error: 'Valid email address required' };
    }

    setIsExporting(true);
    try {
      const range = fromDate && toDate
        ? `${fromDate} to ${toDate}`
        : fromDate
        ? `From ${fromDate}`
        : toDate
        ? `Up to ${toDate}`
        : 'All Recorded Dates';

      const filterSummary = {
        type: typeFilter,
        search: search.trim(),
        range,
      };

      const res = await apiFetchWithTimeout<{ success: boolean; message?: string; previewUrl?: string }>(
        '/api/export/email',
        {
          targetEmail,
          userName: user?.name,
          filterSummary,
          transactions: filteredTransactions,
        },
        20000
      );

      if (res.data?.success) {
        toast(res.data.message || `Statement PDF sent to ${targetEmail} ✓`);
        return { success: true, previewUrl: res.data.previewUrl, message: res.data.message };
      } else {
        const errMsg = res.error || 'Failed to email statement';
        toast(errMsg);
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Export error';
      toast(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setIsExporting(false);
    }
  }, [user, filteredTransactions, typeFilter, search, fromDate, toDate, toast]);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        filteredTransactions,
        isLoading,
        isSyncing,
        unsyncedCount,
        period,
        search,
        typeFilter,
        fromDate,
        toDate,
        periodData,
        balance,
        setPeriod,
        setSearch,
        setTypeFilter,
        setFromDate,
        setToDate,
        clearDates,
        saveTransaction,
        deleteTransaction,
        syncNow,
        reloadSampleData,
        clearAllData,
        exportBackup,
        importBackup,
        isExporting,
        emailStatement,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = (): TransactionContextType => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
