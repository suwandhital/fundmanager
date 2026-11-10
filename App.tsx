import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TransactionProvider } from './src/context/TransactionContext';
import { MobileFrame } from './src/components/layout/MobileFrame';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainScreen } from './src/screens/MainScreen';

// Keep native splash screen visible until initial auth and theme states are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const RootApp: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { themeMode, isThemeLoaded } = useTheme();

  const isReady = !isAuthLoading && isThemeLoaded;

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
              <RootApp />
            </TransactionProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
