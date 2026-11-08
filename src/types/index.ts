export type TransactionType = 'income' | 'expense';
export type Period = 'day' | 'week' | 'month' | 'year';
export type TypeFilter = 'all' | 'income' | 'expense';
export type ThemeMode = 'light' | 'dark';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  note: string;
  category: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // timestamp ms
  updatedAt: number;
  time: number; // sort key: date + time-of-day ms
  synced: boolean;
}

/** User returned from API (no password stored client-side) */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

export interface PeriodBucket {
  label: string;
  income: number;
  expense: number;
}

export interface PeriodData {
  buckets: PeriodBucket[];
  totalIncome: number;
  totalExpense: number;
}

export interface BackupData {
  app: string;
  version: number;
  currency: string;
  exportedAt: string;
  user: string;
  transactions: Transaction[];
}
