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
    { d: 4, type: 'income' as const, amount: 2000, note: 'Family gift', category: 'Gift', hour: 15, min: 0 },
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

export const seedDemoLoans = (): import('../types').Loan[] => {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400000);
  const d60 = new Date(now.getTime() - 60 * 86400000);
  const d15 = new Date(now.getTime() - 15 * 86400000);

  return [
    {
      id: uid(),
      type: 'to_pay',
      person: 'Nabil Bank (Personal Loan)',
      phone: '01-4422333',
      principal: 200000,
      startDate: ymd(d60),
      dueDate: ymd(new Date(now.getTime() + 300 * 86400000)),
      interestRate: 11.5,
      interestType: 'yearly',
      note: 'Home renovation loan installment',
      status: 'active',
      createdAt: d60.getTime(),
      updatedAt: d15.getTime(),
      synced: true,
      payments: [
        {
          id: uid(),
          loanId: '',
          date: ymd(d30),
          amount: 25000,
          type: 'both',
          principalPaid: 21160,
          interestPaid: 3840,
          note: '1st Month EMI paid via ConnectIPS',
          createdAt: d30.getTime(),
        },
      ],
    },
    {
      id: uid(),
      type: 'to_pay',
      person: 'Ramesh Sharma (Personal)',
      phone: '9841234567',
      principal: 40000,
      startDate: ymd(d30),
      dueDate: ymd(new Date(now.getTime() + 30 * 86400000)),
      interestRate: 0,
      interestType: 'none',
      note: 'Emergency medical expense',
      status: 'active',
      createdAt: d30.getTime(),
      updatedAt: d15.getTime(),
      synced: true,
      payments: [
        {
          id: uid(),
          loanId: '',
          date: ymd(d15),
          amount: 15000,
          type: 'principal',
          principalPaid: 15000,
          interestPaid: 0,
          note: 'Cash returned at office',
          createdAt: d15.getTime(),
        },
      ],
    },
    {
      id: uid(),
      type: 'to_receive',
      person: 'Bikash Adhikari (Colleague)',
      phone: '9851098765',
      principal: 60000,
      startDate: ymd(d60),
      dueDate: ymd(new Date(now.getTime() + 60 * 86400000)),
      interestRate: 1.5,
      interestType: 'monthly',
      note: 'Laptop purchase support',
      status: 'active',
      createdAt: d60.getTime(),
      updatedAt: d30.getTime(),
      synced: true,
      payments: [
        {
          id: uid(),
          loanId: '',
          date: ymd(d30),
          amount: 900,
          type: 'interest',
          principalPaid: 0,
          interestPaid: 900,
          note: 'Month 1 interest received via Bank transfer',
          createdAt: d30.getTime(),
        },
      ],
    },
    {
      id: uid(),
      type: 'to_receive',
      person: 'Sunil Thapa (Neighbor)',
      phone: '9801234890',
      principal: 15000,
      startDate: ymd(d15),
      interestRate: 0,
      interestType: 'none',
      note: 'Short term loan',
      status: 'active',
      createdAt: d15.getTime(),
      updatedAt: d15.getTime(),
      synced: true,
      payments: [],
    },
  ];
};

export const migrateLoan = (l: any): import('../types').Loan => {
  const payments = Array.isArray(l.payments)
    ? l.payments.map((p: any) => ({
        id: p.id || uid(),
        loanId: l.id || '',
        date: p.date || ymd(new Date()),
        amount: Math.max(0, Number(p.amount) || 0),
        type: p.type === 'interest' || p.type === 'principal' || p.type === 'both' ? p.type : 'principal',
        principalPaid: Math.max(0, Number(p.principalPaid) || 0),
        interestPaid: Math.max(0, Number(p.interestPaid) || 0),
        note: String(p.note || ''),
        createdAt: Number(p.createdAt) || Date.now(),
      }))
    : [];

  return {
    id: l.id || uid(),
    type: l.type === 'to_receive' ? 'to_receive' : 'to_pay',
    person: String(l.person || 'Unknown Contact'),
    phone: l.phone ? String(l.phone) : undefined,
    principal: Math.max(0, Number(l.principal) || 0),
    startDate: l.startDate || ymd(new Date()),
    dueDate: l.dueDate || undefined,
    interestRate: Math.max(0, Number(l.interestRate) || 0),
    interestType: l.interestType === 'monthly' || l.interestType === 'yearly' ? l.interestType : 'none',
    note: String(l.note || ''),
    payments,
    status: l.status === 'settled' ? 'settled' : 'active',
    createdAt: Number(l.createdAt) || Date.now(),
    updatedAt: Number(l.updatedAt) || Date.now(),
    synced: l.synced !== false,
  };
};

