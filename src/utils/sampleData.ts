import { Transaction, User } from '../types';
import { uid } from './crypto';
import { ymd, parseDate, txDatetime } from './formatters';

export const DEMO_EMAIL = 'demo@fund.local';
export const DEMO_PASS = 'demo';

export const createDemoUser = (): User => {
  return {
    id: 'demo_user_id',
    email: DEMO_EMAIL,
    name: 'Demo',
    createdAt: Date.now() - 30 * 86400000,
  };
};

export const seedDemoTransactions = (): Transaction[] => {
  const txs: Transaction[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const recent = [
    { d: 0, type: 'income' as const, amount: 85000, note: 'Monthly salary', category: 'Salary', hour: 9, min: 15 },
    { d: 0, type: 'expense' as const, amount: 250, note: 'Momo & chiya', category: 'Food', hour: 11, min: 5 },
    { d: 0, type: 'expense' as const, amount: 180, note: 'Pathao ride', category: 'Transport', hour: 14, min: 40 },
    { d: 0, type: 'expense' as const, amount: 850, note: 'Dinner at Thamel', category: 'Food', hour: 19, min: 20 },
    { d: 1, type: 'expense' as const, amount: 3240, note: 'Bhatbhateni groceries', category: 'Food', hour: 17, min: 10 },
    { d: 1, type: 'income' as const, amount: 15000, note: 'Freelance project', category: 'Freelance', hour: 22, min: 0 },
    { d: 2, type: 'expense' as const, amount: 2499, note: 'WorldLink internet', category: 'Bills', hour: 10, min: 30 },
    { d: 3, type: 'expense' as const, amount: 500, note: 'NTC recharge', category: 'Bills', hour: 8, min: 45 },
    { d: 4, type: 'income' as const, amount: 2000, note: 'Dashain gift', category: 'Gift', hour: 15, min: 0 },
    { d: 6, type: 'expense' as const, amount: 25000, note: 'House rent', category: 'Rent', hour: 12, min: 0 },
  ];

  recent.forEach(r => {
    const d = new Date(today);
    d.setDate(d.getDate() - r.d);
    d.setHours(r.hour, r.min, 0, 0);
    const createdAt = d.getTime();
    txs.push({
      id: uid(),
      type: r.type,
      amount: r.amount,
      note: r.note,
      category: r.category,
      date: ymd(d),
      createdAt,
      updatedAt: createdAt,
      time: createdAt,
      synced: true,
    });
  });

  const expenseNotes = [
    'Dal bhat', 'Momo', 'Chiya & samosa', 'Bhatbhateni', 'Big Mart',
    'Pathao ride', 'Tempo fare', 'Sajha bus', 'NEA electricity bill',
    'WorldLink internet', 'NTC recharge', 'Pharmacy', 'Movie tickets',
    'Gym membership', 'Himalayan Java coffee', 'Books from Ekta',
    'Clothes shopping', 'Kitchen supplies', 'Streaming subscription',
    'Sweets from Bhaktapur',
  ];

  const incomeNotes = [
    'Freelance project', 'Client payment', 'Dividend', 'Side gig',
    'Consulting', 'Teaching tuition', 'Remittance', 'Sold old phone',
  ];

  const expenseCats = ['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Fun', 'Rent', 'Other'];
  const incomeCats = ['Salary', 'Freelance', 'Business', 'Gift', 'Investment', 'Other'];

  for (let i = 0; i < 55; i++) {
    const daysAgo = 11 + Math.floor(Math.random() * 400);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(7 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60), 0, 0);
    const createdAt = d.getTime();

    const type = Math.random() < 0.28 ? 'income' : 'expense';
    const amount = type === 'income'
      ? Math.round((3000 + Math.random() * 40000) * 100) / 100
      : Math.round((50 + Math.random() * 5000) * 100) / 100;

    txs.push({
      id: uid(),
      type,
      amount,
      note: type === 'income'
        ? incomeNotes[Math.floor(Math.random() * incomeNotes.length)]
        : expenseNotes[Math.floor(Math.random() * expenseNotes.length)],
      category: type === 'income'
        ? incomeCats[Math.floor(Math.random() * incomeCats.length)]
        : expenseCats[Math.floor(Math.random() * expenseCats.length)],
      date: ymd(d),
      createdAt,
      updatedAt: createdAt,
      time: createdAt,
      synced: Math.random() > 0.2,
    });
  }

  txs.sort((a, b) => b.time - a.time);
  return txs;
};

export const migrateTx = (t: any): Transaction => {
  const date = t.date || ymd(new Date());
  const createdAt = t.createdAt || (parseDate(date).getTime() + 12 * 3600000);
  const calculatedTime = txDatetime({ date, createdAt });
  return {
    id: t.id || uid(),
    type: t.type === 'income' ? 'income' : 'expense',
    amount: Math.max(0, Number(t.amount) || 0),
    note: String(t.note || ''),
    category: String(t.category || (t.type === 'income' ? 'Salary' : 'Other')),
    date,
    createdAt,
    updatedAt: t.updatedAt || Date.now(),
    time: calculatedTime,
    synced: t.synced !== false,
  };
};

