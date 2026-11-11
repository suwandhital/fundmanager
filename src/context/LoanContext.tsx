import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Loan, LoanPayment, LoanType } from '../types';
import { useAuth, apiFetchWithTimeout } from './AuthContext';
import { useToast } from './ToastContext';
import { uid, sanitizeString } from '../utils/crypto';
import { ymd } from '../utils/formatters';
import { seedDemoLoans, migrateLoan } from '../utils/sampleData';
import { calculateLoanDetails } from '../utils/loanCalculations';

const KEY_LOANS = (uid: string) => `fm.loans.${uid}`;

interface LoanTotals {
  totalPrincipal: number;
  totalInterest: number;
  totalOutstanding: number;
  activeCount: number;
  settledCount: number;
}

interface LoanContextType {
  loans: Loan[];
  toPayLoans: Loan[];
  toReceiveLoans: Loan[];
  toPayTotals: LoanTotals;
  toReceiveTotals: LoanTotals;
  isLoading: boolean;
  isSyncing: boolean;
  saveLoan: (loanData: {
    id?: string | null;
    type: LoanType;
    person: string;
    phone?: string;
    principal: number | string;
    startDate: string;
    dueDate?: string;
    interestRate: number | string;
    interestType: 'none' | 'monthly' | 'yearly';
    note?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteLoan: (id: string) => Promise<boolean>;
  addPayment: (
    loanId: string,
    payment: {
      amount: number | string;
      date: string;
      type: 'interest' | 'principal' | 'both';
      principalPaid?: number | string;
      interestPaid?: number | string;
      note?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deletePayment: (loanId: string, paymentId: string) => Promise<boolean>;
  toggleLoanStatus: (loanId: string) => Promise<boolean>;
  syncLoansNow: (silent?: boolean) => Promise<void>;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

export const LoanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load loans whenever user changes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) {
        if (isMounted) {
          setLoans([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        let raw = await AsyncStorage.getItem(KEY_LOANS(user.id));
        if (!raw && user.email) {
          raw = await AsyncStorage.getItem(KEY_LOANS(user.email));
        }
        if (!isMounted) return;

        let list: Loan[] = [];
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              list = parsed.map(migrateLoan);
            }
          } catch {
            list = [];
          }
        }

        // Demo user gets realistic sample loans
        if (list.length === 0 && user.email === 'demo@fund.local') {
          list = seedDemoLoans();
          const json = JSON.stringify(list);
          await AsyncStorage.setItem(KEY_LOANS(user.id), json).catch(() => {});
          if (user.email) await AsyncStorage.setItem(KEY_LOANS(user.email), json).catch(() => {});
        }

        list.sort((a, b) => b.createdAt - a.createdAt);
        if (isMounted) {
          setLoans(list);
          setIsLoading(false);
        }

        if (user.email === 'demo@fund.local') return;

        // Fetch from cloud in background and merge
        const queryUrl = `/api/loans?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`;
        apiFetchWithTimeout<{ loans: Loan[] }>(queryUrl, undefined, 8000)
          .then(async ({ data }) => {
            if (!isMounted || !data?.loans) return;
            const remoteList = data.loans.map(migrateLoan);
            if (remoteList.length > 0) {
              const map = new Map<string, Loan>();
              for (const r of remoteList) map.set(r.id, r);
              for (const l of list) {
                if (!l.synced || !map.has(l.id)) {
                  map.set(l.id, l);
                } else {
                  const rem = map.get(l.id)!;
                  if ((l.updatedAt || 0) > (rem.updatedAt || 0)) {
                    map.set(l.id, l);
                  }
                }
              }
              const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
              if (isMounted) {
                setLoans(merged);
              }
              const json = JSON.stringify(merged);
              await AsyncStorage.setItem(KEY_LOANS(user.id), json).catch(() => {});
              if (user.email) await AsyncStorage.setItem(KEY_LOANS(user.email), json).catch(() => {});
            } else if (list.length > 0) {
              // Local has data but remote is empty — sync up
              apiFetchWithTimeout('/api/loans/sync', {
                userId: user.id,
                email: user.email,
                loans: list,
              }, 8000).catch(() => {});
            }
          })
          .catch(() => {});
      } catch (err) {
        console.error('Failed to load loans:', err);
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
  const persist = useCallback(async (list: Loan[]) => {
    if (!user) return;
    try {
      const json = JSON.stringify(list);
      await AsyncStorage.setItem(KEY_LOANS(user.id), json);
      if (user.email) {
        await AsyncStorage.setItem(KEY_LOANS(user.email), json).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to persist loans:', err);
    }
  }, [user]);

  // Filtered lists
  const toPayLoans = useMemo(() => loans.filter(l => l.type === 'to_pay'), [loans]);
  const toReceiveLoans = useMemo(() => loans.filter(l => l.type === 'to_receive'), [loans]);

  // Aggregate totals
  const computeTotals = useCallback((list: Loan[]): LoanTotals => {
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalOutstanding = 0;
    let activeCount = 0;
    let settledCount = 0;

    for (const l of list) {
      if (l.status === 'settled') {
        settledCount += 1;
        continue;
      }
      activeCount += 1;
      const details = calculateLoanDetails(l);
      totalPrincipal += details.remainingPrincipal;
      totalInterest += details.unpaidInterest;
      totalOutstanding += details.totalOutstanding;
    }

    return {
      totalPrincipal: Math.round(totalPrincipal * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      activeCount,
      settledCount,
    };
  }, []);

  const toPayTotals = useMemo(() => computeTotals(toPayLoans), [toPayLoans, computeTotals]);
  const toReceiveTotals = useMemo(() => computeTotals(toReceiveLoans), [toReceiveLoans, computeTotals]);

  // Save (Create or Update) Loan
  const saveLoan = useCallback(
    async (loanData: {
      id?: string | null;
      type: LoanType;
      person: string;
      phone?: string;
      principal: number | string;
      startDate: string;
      dueDate?: string;
      interestRate: number | string;
      interestType: 'none' | 'monthly' | 'yearly';
      note?: string;
    }) => {
      const personClean = sanitizeString(loanData.person, 60);
      if (!personClean) return { success: false, error: 'Person / Entity name is required' };

      const parsedPrincipal = typeof loanData.principal === 'number' ? loanData.principal : parseFloat(loanData.principal);
      if (!isFinite(parsedPrincipal) || isNaN(parsedPrincipal) || parsedPrincipal <= 0) {
        return { success: false, error: 'Please enter a valid principal amount' };
      }

      const parsedRate = typeof loanData.interestRate === 'number' ? loanData.interestRate : parseFloat(String(loanData.interestRate || '0'));
      const cleanRate = isFinite(parsedRate) && !isNaN(parsedRate) && parsedRate >= 0 ? parsedRate : 0;

      const isEditing = !!loanData.id;
      const now = Date.now();

      let targetLoan: Loan;
      let updatedList: Loan[];

      if (isEditing) {
        const existing = loans.find(l => l.id === loanData.id);
        if (!existing) return { success: false, error: 'Loan not found' };

        targetLoan = {
          ...existing,
          type: loanData.type,
          person: personClean,
          phone: loanData.phone ? sanitizeString(loanData.phone, 30) : undefined,
          principal: Math.round(parsedPrincipal * 100) / 100,
          startDate: loanData.startDate || existing.startDate,
          dueDate: loanData.dueDate || undefined,
          interestRate: cleanRate,
          interestType: loanData.interestType,
          note: loanData.note ? sanitizeString(loanData.note, 200) : '',
          updatedAt: now,
          synced: false,
        };

        updatedList = loans.map(l => (l.id === targetLoan.id ? targetLoan : l));
      } else {
        targetLoan = {
          id: uid(),
          type: loanData.type,
          person: personClean,
          phone: loanData.phone ? sanitizeString(loanData.phone, 30) : undefined,
          principal: Math.round(parsedPrincipal * 100) / 100,
          startDate: loanData.startDate || ymd(new Date()),
          dueDate: loanData.dueDate || undefined,
          interestRate: cleanRate,
          interestType: loanData.interestType,
          note: loanData.note ? sanitizeString(loanData.note, 200) : '',
          payments: [],
          status: 'active',
          createdAt: now,
          updatedAt: now,
          synced: false,
        };

        updatedList = [targetLoan, ...loans];
      }

      setLoans(updatedList);
      await persist(updatedList);

      // Cloud sync in background
      if (user && user.email !== 'demo@fund.local') {
        apiFetchWithTimeout<{ success: boolean }>(
          '/api/loans/sync',
          { userId: user.id, email: user.email, loans: [targetLoan] },
          8000
        )
          .then(({ data }) => {
            if (data?.success) {
              setLoans(prev => {
                const marked = prev.map(l => (l.id === targetLoan.id ? { ...l, synced: true } : l));
                persist(marked);
                return marked;
              });
            }
          })
          .catch(() => {});
      }

      toast(isEditing ? 'Loan record updated' : 'Loan record added');
      return { success: true };
    },
    [loans, persist, toast, user]
  );

  // Delete Loan
  const deleteLoan = useCallback(
    async (id: string) => {
      const updatedList = loans.filter(l => l.id !== id);
      setLoans(updatedList);
      await persist(updatedList);

      if (user && user.email !== 'demo@fund.local') {
        const delUrl = `/api/loans/${encodeURIComponent(id)}?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`;
        apiFetchWithTimeout(delUrl, undefined, 8000, 'DELETE').catch(() => {});
      }

      toast('Loan record deleted');
      return true;
    },
    [loans, persist, toast, user]
  );

  // Add Child Payment
  const addPayment = useCallback(
    async (
      loanId: string,
      payment: {
        amount: number | string;
        date: string;
        type: 'interest' | 'principal' | 'both';
        principalPaid?: number | string;
        interestPaid?: number | string;
        note?: string;
      }
    ) => {
      const parsedAmount = typeof payment.amount === 'number' ? payment.amount : parseFloat(payment.amount);
      if (!isFinite(parsedAmount) || isNaN(parsedAmount) || parsedAmount <= 0) {
        return { success: false, error: 'Please enter a valid payment amount' };
      }

      const existingLoan = loans.find(l => l.id === loanId);
      if (!existingLoan) return { success: false, error: 'Loan not found' };

      const cleanDate = payment.date || ymd(new Date());
      const now = Date.now();

      let pPaid = typeof payment.principalPaid === 'number' ? payment.principalPaid : parseFloat(String(payment.principalPaid || 0));
      let iPaid = typeof payment.interestPaid === 'number' ? payment.interestPaid : parseFloat(String(payment.interestPaid || 0));

      if (payment.type === 'principal') {
        pPaid = parsedAmount;
        iPaid = 0;
      } else if (payment.type === 'interest') {
        iPaid = parsedAmount;
        pPaid = 0;
      } else if (payment.type === 'both' && pPaid + iPaid <= 0) {
        // Default split: cover unpaid interest first, remainder to principal
        const details = calculateLoanDetails(existingLoan);
        iPaid = Math.min(parsedAmount, details.unpaidInterest);
        pPaid = Math.max(0, parsedAmount - iPaid);
      }

      const newPayment: LoanPayment = {
        id: uid(),
        loanId,
        date: cleanDate,
        amount: Math.round(parsedAmount * 100) / 100,
        type: payment.type,
        principalPaid: Math.round(pPaid * 100) / 100,
        interestPaid: Math.round(iPaid * 100) / 100,
        note: payment.note ? sanitizeString(payment.note, 120) : '',
        createdAt: now,
      };

      const updatedPayments = [newPayment, ...(existingLoan.payments || [])];
      
      // Check if loan is now fully settled
      const updatedLoanTemp: Loan = { ...existingLoan, payments: updatedPayments };
      const detailsAfter = calculateLoanDetails(updatedLoanTemp);
      const isNowSettled = detailsAfter.remainingPrincipal <= 0 && detailsAfter.unpaidInterest <= 0;

      const updatedLoan: Loan = {
        ...existingLoan,
        payments: updatedPayments,
        status: isNowSettled ? 'settled' : existingLoan.status,
        updatedAt: now,
        synced: false,
      };

      const updatedList = loans.map(l => (l.id === loanId ? updatedLoan : l));
      setLoans(updatedList);
      await persist(updatedList);

      if (user && user.email !== 'demo@fund.local') {
        apiFetchWithTimeout<{ success: boolean }>(
          '/api/loans/sync',
          { userId: user.id, email: user.email, loans: [updatedLoan] },
          8000
        )
          .then(({ data }) => {
            if (data?.success) {
              setLoans(prev => {
                const marked = prev.map(l => (l.id === loanId ? { ...l, synced: true } : l));
                persist(marked);
                return marked;
              });
            }
          })
          .catch(() => {});
      }

      toast(isNowSettled ? 'Payment added — Loan is fully settled! 🎉' : 'Payment recorded');
      return { success: true };
    },
    [loans, persist, toast, user]
  );

  // Delete Child Payment
  const deletePayment = useCallback(
    async (loanId: string, paymentId: string) => {
      const existingLoan = loans.find(l => l.id === loanId);
      if (!existingLoan) return false;

      const updatedPayments = (existingLoan.payments || []).filter(p => p.id !== paymentId);
      const now = Date.now();

      const updatedLoanTemp: Loan = { ...existingLoan, payments: updatedPayments };
      const details = calculateLoanDetails(updatedLoanTemp);
      const status = details.remainingPrincipal > 0 ? 'active' : existingLoan.status;

      const updatedLoan: Loan = {
        ...existingLoan,
        payments: updatedPayments,
        status,
        updatedAt: now,
        synced: false,
      };

      const updatedList = loans.map(l => (l.id === loanId ? updatedLoan : l));
      setLoans(updatedList);
      await persist(updatedList);

      if (user && user.email !== 'demo@fund.local') {
        apiFetchWithTimeout('/api/loans/sync', {
          userId: user.id,
          email: user.email,
          loans: [updatedLoan],
        }, 8000).catch(() => {});
      }

      toast('Payment record removed');
      return true;
    },
    [loans, persist, toast, user]
  );

  // Toggle Settled / Active status
  const toggleLoanStatus = useCallback(
    async (loanId: string) => {
      const existingLoan = loans.find(l => l.id === loanId);
      if (!existingLoan) return false;

      const newStatus = existingLoan.status === 'active' ? 'settled' : 'active';
      const now = Date.now();

      const updatedLoan: Loan = {
        ...existingLoan,
        status: newStatus,
        updatedAt: now,
        synced: false,
      };

      const updatedList = loans.map(l => (l.id === loanId ? updatedLoan : l));
      setLoans(updatedList);
      await persist(updatedList);

      if (user && user.email !== 'demo@fund.local') {
        apiFetchWithTimeout('/api/loans/sync', {
          userId: user.id,
          email: user.email,
          loans: [updatedLoan],
        }, 8000).catch(() => {});
      }

      toast(newStatus === 'settled' ? 'Marked as settled ✓' : 'Marked as active');
      return true;
    },
    [loans, persist, toast, user]
  );

  // Manual / Auto Full Sync
  const syncLoansNow = useCallback(async (silent = false) => {
    if (!user || user.email === 'demo@fund.local') {
      if (!silent) toast('Demo mode: operates locally');
      return;
    }

    setIsSyncing(true);
    try {
      const queryUrl = `/api/loans?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`;
      const { data, error } = await apiFetchWithTimeout<{ loans: Loan[] }>(queryUrl, undefined, 8000);

      if (error) {
        if (!silent) toast(`Sync failed: ${error}`);
        return;
      }

      const remoteList = (data?.loans || []).map(migrateLoan);
      const map = new Map<string, Loan>();
      for (const r of remoteList) map.set(r.id, r);

      const toUpload: Loan[] = [];
      for (const l of loans) {
        if (!l.synced || !map.has(l.id)) {
          toUpload.push(l);
          map.set(l.id, l);
        } else {
          const rem = map.get(l.id)!;
          if ((l.updatedAt || 0) > (rem.updatedAt || 0)) {
            toUpload.push(l);
            map.set(l.id, l);
          }
        }
      }

      if (toUpload.length > 0) {
        await apiFetchWithTimeout('/api/loans/sync', {
          userId: user.id,
          email: user.email,
          loans: toUpload,
        }, 8000);
      }

      const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
      setLoans(merged);
      await persist(merged);
      if (!silent) toast('Loans synchronized with cloud ✓');
    } catch {
      if (!silent) toast('Sync failed — check connection');
    } finally {
      setIsSyncing(false);
    }
  }, [user, loans, persist, toast]);

  return (
    <LoanContext.Provider
      value={{
        loans,
        toPayLoans,
        toReceiveLoans,
        toPayTotals,
        toReceiveTotals,
        isLoading,
        isSyncing,
        saveLoan,
        deleteLoan,
        addPayment,
        deletePayment,
        toggleLoanStatus,
        syncLoansNow,
      }}
    >
      {children}
    </LoanContext.Provider>
  );
};

export const useLoans = (): LoanContextType => {
  const context = useContext(LoanContext);
  if (!context) {
    throw new Error('useLoans must be used within a LoanProvider');
  }
  return context;
};

