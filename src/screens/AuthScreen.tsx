import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Eye, EyeOff, Fingerprint, WalletCards } from 'lucide-react-native';

type Mode = 'login' | 'register';

export const AuthScreen: React.FC = () => {
  const {
    login,
    register,
    loginWithBiometric,
    isBiometricAvailable,
    isBiometricEnabled,
  } = useAuth();
  const { theme, themeMode } = useTheme();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === 'login';

  const clearError = () => setError('');

  const handleSubmit = useCallback(async () => {
    clearError();
    const cleanEmail = email.trim().toLowerCase();

    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!cleanEmail || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      let res: { success: boolean; error?: string };
      if (isLogin) {
        res = await login(cleanEmail, password);
      } else {
        res = await register(name.trim(), cleanEmail, password);
      }

      if (!res.success) {
        setError(res.error ?? 'Something went wrong');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setIsSubmitting(false);
    }
  }, [isLogin, name, email, password, login, register]);

  const handleBiometricLogin = useCallback(async () => {
    clearError();
    const res = await loginWithBiometric();
    if (!res.success) {
      setError(res.error ?? 'Biometric login failed');
    }
  }, [loginWithBiometric]);

  const switchMode = () => {
    clearError();
    setName('');
    setEmail('');
    setPassword('');
    setMode(prev => (prev === 'login' ? 'register' : 'login'));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { backgroundColor: theme.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand ── */}
        <View style={styles.brand}>
          <View style={[styles.logoMark, { backgroundColor: themeMode === 'dark' ? '#111827' : '#0f172a' }]}>
            <WalletCards size={34} color="#10b981" strokeWidth={2.2} />
          </View>
          <Text style={[styles.brandOwner, { color: theme.income }]}>{"Suwan's"}</Text>
          <Text style={[styles.brandName, { color: theme.text }]}>FundManager</Text>
          <Text style={[styles.brandTagline, { color: theme.muted }]}>
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>
          {/* Name (register only) */}
          {!isLogin && (
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>Full Name</Text>
              <TextInput
                value={name}
                onChangeText={v => {
                  setName(v);
                  clearError();
                }}
                placeholder="Your name"
                placeholderTextColor={theme.muted}
                autoCapitalize="words"
                style={[
                  styles.field,
                  {
                    backgroundColor: theme.fieldBg,
                    borderColor: theme.line,
                    color: theme.text,
                  },
                ]}
                returnKeyType="next"
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={v => {
                setEmail(v);
                clearError();
              }}
              placeholder="you@example.com"
              placeholderTextColor={theme.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.field,
                {
                  backgroundColor: theme.fieldBg,
                  borderColor: theme.line,
                  color: theme.text,
                },
              ]}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Password</Text>
            <View
              style={[
                styles.passwordWrap,
                { backgroundColor: theme.fieldBg, borderColor: theme.line },
              ]}
            >
              <TextInput
                value={password}
                onChangeText={v => {
                  setPassword(v);
                  clearError();
                }}
                placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
                placeholderTextColor={theme.muted}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                style={[styles.passwordInput, { color: theme.text }]}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                onPress={() => setShowPass(p => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPass ? (
                  <EyeOff size={17} color={theme.muted} strokeWidth={1.8} />
                ) : (
                  <Eye size={17} color={theme.muted} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <View
              style={[
                styles.errorBand,
                {
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  borderColor: 'rgba(239,68,68,0.2)',
                },
              ]}
            >
              <Text style={[styles.errorText, { color: theme.expense }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnPrimary,
              { backgroundColor: theme.text },
              isSubmitting && styles.btnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.card} />
            ) : (
              <Text style={[styles.btnText, { color: theme.card }]}>
                {isLogin ? 'Log in' : 'Create account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Biometric login button (if enabled) */}
          {isLogin && isBiometricAvailable && isBiometricEnabled && (
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnBio,
                { backgroundColor: theme.track, borderColor: theme.line },
              ]}
              onPress={handleBiometricLogin}
              activeOpacity={0.8}
            >
              <Fingerprint size={18} color={theme.text} strokeWidth={1.8} />
              <Text style={[styles.btnText, { color: theme.text }]}>
                Sign in with Biometrics
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Switch mode ── */}
        <View style={styles.switchRow}>
          <Text style={[styles.switchMuted, { color: theme.muted }]}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <TouchableOpacity onPress={switchMode} activeOpacity={0.7}>
            <Text style={[styles.switchLink, { color: theme.accent }]}>
              {isLogin ? 'Sign up' : 'Log in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoMark: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  logoLetter: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandOwner: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 13,
  },
  form: {
    gap: 13,
    marginBottom: 20,
  },
  fieldWrap: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.3,
    paddingLeft: 2,
  },
  field: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    outlineStyle: 'none' as any,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    outlineStyle: 'none' as any,
  },
  errorBand: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: {
    // filled with theme.text
  },
  btnBio: {
    borderWidth: 1,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  switchMuted: {
    fontSize: 13,
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '600',
  },
});
