import { Loan, LoanCalculations } from '../types';

/**
 * Parses YYYY-MM-DD string to Date object set to UTC midnight for exact day-difference math
 */
export function parseDateOnly(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Returns difference in whole days between two Date objects
 */
export function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates live counting interest, remaining principal, and outstanding balances
 * using timeline-segmented interest accrual.
 */
export function calculateLoanDetails(loan: Loan, asOfDate: Date = new Date()): LoanCalculations {
  const principal = Number(loan.principal) || 0;
  const rate = Number(loan.interestRate) || 0;
  const type = loan.interestType || 'none';

  // Total payments summary
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  for (const p of loan.payments || []) {
    const amt = Number(p.amount) || 0;
    if (p.type === 'interest') {
      totalInterestPaid += amt;
    } else if (p.type === 'principal') {
      totalPrincipalPaid += amt;
    } else if (p.type === 'both') {
      const iPaid = Number(p.interestPaid) || 0;
      const pPaid = Number(p.principalPaid) || 0;
      if (iPaid + pPaid > 0) {
        totalInterestPaid += iPaid;
        totalPrincipalPaid += pPaid;
      } else {
        // If split not specified, assume payment covers principal
        totalPrincipalPaid += amt;
      }
    }
  }

  const remainingPrincipal = Math.max(0, Math.round((principal - totalPrincipalPaid) * 100) / 100);

  const startUtc = parseDateOnly(loan.startDate);
  const asOfUtc = new Date(Date.UTC(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate()));
  const totalElapsedDays = diffDays(startUtc, asOfUtc);
  const elapsedMonths = Math.round((totalElapsedDays / 30.4167) * 10) / 10;

  if (type === 'none' || rate <= 0 || principal <= 0) {
    return {
      remainingPrincipal,
      totalAccruedInterest: 0,
      totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
      totalPrincipalPaid: Math.round(totalPrincipalPaid * 100) / 100,
      unpaidInterest: 0,
      totalOutstanding: remainingPrincipal,
      elapsedDays: totalElapsedDays,
      elapsedMonths,
    };
  }

  // Daily interest rate factor
  // Monthly rate: (rate / 100) / (365 / 12) = (rate * 12) / (365 * 100)
  // Yearly rate: rate / (100 * 365)
  const dailyRate =
    type === 'monthly'
      ? (rate * 12) / (365 * 100)
      : rate / (365 * 100);

  // Segmented timeline calculation based on payments
  // Sort payments by date ascending
  const sortedPayments = [...(loan.payments || [])].sort((a, b) => {
    return parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime();
  });

  let runningPrincipal = principal;
  let totalAccruedInterest = 0;
  let lastDate = startUtc;

  for (const payment of sortedPayments) {
    const pDate = parseDateOnly(payment.date);
    if (pDate.getTime() > lastDate.getTime() && pDate.getTime() <= asOfUtc.getTime()) {
      const days = diffDays(lastDate, pDate);
      totalAccruedInterest += runningPrincipal * dailyRate * days;
      lastDate = pDate;
    }

    // Deduct principal if this payment reduced principal
    if (payment.type === 'principal') {
      runningPrincipal = Math.max(0, runningPrincipal - Number(payment.amount));
    } else if (payment.type === 'both') {
      const pPaid = Number(payment.principalPaid) || 0;
      runningPrincipal = Math.max(0, runningPrincipal - pPaid);
    }
  }

  // Interest from last payment date to asOfDate
  if (asOfUtc.getTime() > lastDate.getTime()) {
    const remainingDays = diffDays(lastDate, asOfUtc);
    totalAccruedInterest += runningPrincipal * dailyRate * remainingDays;
  }

  totalAccruedInterest = Math.round(totalAccruedInterest * 100) / 100;
  const unpaidInterest = Math.max(0, Math.round((totalAccruedInterest - totalInterestPaid) * 100) / 100);
  const totalOutstanding = Math.round((remainingPrincipal + unpaidInterest) * 100) / 100;

  return {
    remainingPrincipal,
    totalAccruedInterest,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    totalPrincipalPaid: Math.round(totalPrincipalPaid * 100) / 100,
    unpaidInterest,
    totalOutstanding,
    elapsedDays: totalElapsedDays,
    elapsedMonths,
  };
}
