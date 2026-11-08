export interface ThemeColors {
  bg: string;
  card: string;
  raised: string;
  track: string;
  fieldBg: string;
  hover: string;
  activeRow: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  income: string;
  expense: string;
  toastBg: string;
  toastFg: string;
  balanceGradientStart: string;
  balanceGradientEnd: string;
  overlay: string;
}

export const lightTheme: ThemeColors = {
  bg: '#f5f6f8',
  card: '#ffffff',
  raised: '#ffffff',
  track: '#f1f2f5',
  fieldBg: '#ffffff',
  hover: '#f6f7f9',
  activeRow: '#fafbfc',
  text: '#0f172a',
  muted: '#8a92a0',
  line: '#eef0f4',
  accent: '#4f46e5',
  income: '#16a34a',
  expense: '#ef4444',
  toastBg: '#0f172a',
  toastFg: '#ffffff',
  balanceGradientStart: '#0f172a',
  balanceGradientEnd: '#1e293b',
  overlay: 'rgba(8, 11, 18, 0.55)',
};

export const darkTheme: ThemeColors = {
  bg: '#0b0f17',
  card: '#141a24',
  raised: '#232d3d',
  track: '#1b2230',
  fieldBg: '#1b2230',
  hover: '#1b2230',
  activeRow: '#1a2130',
  text: '#e8edf5',
  muted: '#7c8698',
  line: '#232b39',
  accent: '#818cf8',
  income: '#4ade80',
  expense: '#f87171',
  toastBg: '#e8edf5',
  toastFg: '#0b0f17',
  balanceGradientStart: '#151b28',
  balanceGradientEnd: '#202a3c',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

