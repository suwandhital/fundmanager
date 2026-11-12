import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ToastContextType {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [translateYAnim] = useState(() => new Animated.Value(10));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage(msg);
    setVisible(true);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
      });
    }, 2200);
  }, [opacityAnim, translateYAnim]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            {
              backgroundColor: theme.toastBg,
              opacity: opacityAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          <Text style={[styles.toastText, { color: theme.toastFg }]}>
            {message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: Platform.OS === 'web' ? 96 : 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 0,
    zIndex: 999,
    maxWidth: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
