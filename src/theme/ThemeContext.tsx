import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../types';
import { ThemeColors, lightTheme, darkTheme } from './colors';

const THEME_KEY = 'fm.theme';

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: ThemeColors;
  isThemeLoaded: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(saved => {
        if (saved === 'dark' || saved === 'light') {
          setThemeModeState(saved);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsThemeLoaded(true);
      });
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeMode === 'dark' ? 'light' : 'dark');
  }, [themeMode, setTheme]);

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ themeMode, theme, isThemeLoaded, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

