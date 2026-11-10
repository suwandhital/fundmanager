import { Transaction, Period } from '../types';

export const CURRENCY = 'NRS ';
export const LOCALE = 'en-IN';

export const CATEGORIES = {
  expense: ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Rent', 'Other'],
  income: ['Salary', 'Freelance', 'Business', 'Gift', 'Investment', 'Other'],
};

export const PERIOD_LABELS: Record<Period, string> = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
};

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseDate = (s: string): Date => {
  if (!s || typeof s !== 'string') return new Date();
  const parts = s.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const num = (n: number): string => {
  return Number(n).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const money = (n: number): string => CURRENCY + num(n);

export const timeOfDay = (ts: number): number => {
  const d = new Date(ts);
  return d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000;
};

export const txDatetime = (t: Partial<Transaction>): number => {
  if (!t.date) return t.createdAt || Date.now();
  return parseDate(t.date).getTime() + timeOfDay(t.createdAt || Date.now());
};

export const fmtDate = (s: string): string => {
  try {
    const d = parseDate(s);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('en-US', opts);
  } catch {
    return s;
  }
};

export const fmtTime = (ts: number): string => {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

export const fmtYAxis = (n: number): string => {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return Math.round(n).toString();
};

export const hexToRgba = (hex: string, a: number): string => {
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
