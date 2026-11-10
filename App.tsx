import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TransactionProvider } from './src/context/TransactionContext';
import { MobileFrame } from './src/components/layout/MobileFrame';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainScreen } from './src/screens/MainScreen';

// Keep native splash screen visible until initial auth state is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const RootApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { themeMode } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
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
    <SafeAreaProvider>
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
