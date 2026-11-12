import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const { theme, themeMode } = useTheme();

  if (Platform.OS === 'web') {
    // On web: show a phone frame centered on screen
    return (
      <View
        style={[
          styles.webOuter,
          { backgroundColor: themeMode === 'dark' ? '#070a10' : '#e9ebf0' },
        ]}
      >
        <View
          style={[
            styles.webFrame,
            {
              backgroundColor: theme.bg,
              borderColor: themeMode === 'dark' ? '#1c2432' : '#e2e5eb',
            },
          ]}
        >
          <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]} edges={['top', 'bottom', 'left', 'right']}>
            {children}
          </SafeAreaView>
        </View>
      </View>
    );
  }

  // On native: full screen with safe area insets
  return (
    <SafeAreaView
      style={[styles.nativeSafe, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFrame: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    maxHeight: 920,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 20px 60px -15px rgba(0,0,0,0.25)',
          marginVertical: 'auto',
        } as any)
      : {}),
  },
  safeArea: {
    flex: 1,
  },
  nativeSafe: {
    flex: 1,
  },
});
