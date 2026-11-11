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
  loans?: Loan[];
}

export type LoanType = 'to_pay' | 'to_receive';
export type InterestType = 'none' | 'monthly' | 'yearly';
export type PaymentType = 'interest' | 'principal' | 'both';

export interface LoanPayment {
  id: string;
  loanId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: PaymentType;
  principalPaid: number;
  interestPaid: number;
  note?: string;
  createdAt: number;
}

export interface Loan {
  id: string;
  type: LoanType; // 'to_pay' = borrowed / debt to pay, 'to_receive' = lent / receivable
  person: string;
  phone?: string;
  principal: number;
  startDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  interestRate: number; // number, e.g. 1.5 or 12, 0 for none
  interestType: InterestType; // 'none' | 'monthly' | 'yearly'
  note?: string;
  payments: LoanPayment[];
  status: 'active' | 'settled';
  createdAt: number;
  updatedAt: number;
  synced?: boolean;
}

export interface LoanCalculations {
  remainingPrincipal: number;
  totalAccruedInterest: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  unpaidInterest: number;
  totalOutstanding: number;
  elapsedDays: number;
  elapsedMonths: number;
}
