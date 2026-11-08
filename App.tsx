import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TransactionProvider } from './src/context/TransactionContext';
import { MobileFrame } from './src/components/layout/MobileFrame';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainScreen } from './src/screens/MainScreen';
import { WalletCards } from 'lucide-react-native';

const RootApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { themeMode } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.splashScreen}>
        <StatusBar style="light" />
        <View style={styles.splashBrand}>
          <View style={styles.splashIconWrap}>
            <WalletCards size={36} color="#0f172a" strokeWidth={2.2} />
          </View>
          <Text style={styles.splashOwner}>{"Suwan's"}</Text>
          <Text style={styles.splashName}>FundManager</Text>
        </View>
        <ActivityIndicator size="small" color="#94a3b8" style={{ marginTop: 28 }} />
      </View>
    );
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

const styles = StyleSheet.create({
  splashScreen: {
    flex: 1,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashBrand: {
    alignItems: 'center',
  },
  splashIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  splashOwner: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  splashName: {
    fontSize: 22,
    fontWeight: '750' as any,
    color: '#f8fafc',
    letterSpacing: -0.4,
  },
});
