import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TransactionProvider, useTransactions } from './src/context/TransactionContext';
import { LoanProvider } from './src/context/LoanContext';
import { MobileFrame } from './src/components/layout/MobileFrame';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainScreen } from './src/screens/MainScreen';

// Keep native splash screen visible until initial auth, theme, and data states are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const RootApp: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { themeMode, isThemeLoaded } = useTheme();
  const { isLoading: isTxLoading } = useTransactions();

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
