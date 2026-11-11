import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TransactionProvider, useTransactions } from './src/context/TransactionContext';
import { LoanProvider, useLoans } from './src/context/LoanContext';
import { MobileFrame } from './src/components/layout/MobileFrame';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainScreen } from './src/screens/MainScreen';

// Keep native splash screen visible until initial auth, theme, and data states are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const RootApp: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { themeMode, isThemeLoaded } = useTheme();
  const { isLoading: isTxLoading, syncNow } = useTransactions();
  const { syncLoansNow } = useLoans();

  // Full state readiness: auth + theme + initial cached transactions loaded
  // Prevents any flashing numbers, blank charts, or visual glitch on startup
  const isReady = !isAuthLoading && isThemeLoaded && (!user || !isTxLoading);

  useEffect(() => {
    if (isReady) {
      // Allow first paint to rasterize before dismissing splash for zero flicker
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  // ── Automatic Background Sync ─────────────────────────────────────────────
  // Silently synchronizes data with MongoDB Atlas on launch, interval, and app resume
  useEffect(() => {
    if (!user || user.email === 'demo@fund.local') return;

    let isMounted = true;
    const runAutoSync = async () => {
      if (!isMounted) return;
      try {
        await Promise.allSettled([
          syncNow(true),
          syncLoansNow(true),
        ]);
      } catch {}
    };

    // 1. Initial sync after app loads
    const initialTimer = setTimeout(runAutoSync, 2000);

    // 2. Periodic sync every 30 seconds
    const interval = setInterval(runAutoSync, 30000);

    // 3. Foreground sync when returning to app
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        runAutoSync();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      sub.remove();
    };
  }, [user, syncNow, syncLoansNow]);

  // ── Automatic Background Over-The-Air Updates ─────────────────────────────
  // Silently checks for updates on launch & resume; auto-downloads and reloads
  useEffect(() => {
    if (!Updates.isEnabled) return;

    let isMounted = true;
    let isUpdating = false;

    const checkAndAutoUpdate = async () => {
      if (!isMounted || isUpdating) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable && isMounted) {
          isUpdating = true;
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {}
    };

    const timer = setTimeout(checkAndAutoUpdate, 3000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkAndAutoUpdate();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <MobileFrame>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      {!user ? <AuthScreen /> : <MainScreen />}
    </MobileFrame>
  );
};

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TransactionProvider>
              <LoanProvider>
                <RootApp />
              </LoanProvider>
            </TransactionProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
