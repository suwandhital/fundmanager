import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { User } from '../types';
import { uid, hashPassword } from '../utils/crypto';

// ─── Storage Keys (Persistent Local-First Storage) ───────────────────────────
const KEY_SESSION = 'fm.session.active.v6';
const KEY_USERS = 'fm.users.local.v6';
const KEY_BIO_ENABLED = 'fm.bio.enabled.v6';
const KEY_BIO_USER = 'fm.bio.user.v6';

// ─── Bulletproof Cross-Platform Storage ──────────────────────────────────────
async function secureSet(key: string, val: string): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(key, val);
    }
  } catch {
    // fallback
  }
  await AsyncStorage.setItem(key, val).catch(() => {});
}

async function secureGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const v = await SecureStore.getItemAsync(key);
      if (v !== null) return v;
    }
  } catch {
    // fallback
  }
  return AsyncStorage.getItem(key).catch(() => null);
}

async function secureDelete(key: string): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // fallback
  }
  await AsyncStorage.removeItem(key).catch(() => {});
}

// ─── Dynamic API Host Resolution ─────────────────────────────────────────────
// Supports cloud production (Azure App Service) with zero private network lock-in
export const PRODUCTION_API_URL = 'https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net';

export function getApiBase(): string {
  // If explicitly overridden via environment variable (must be public cloud URL):
  if (
    process.env.EXPO_PUBLIC_API_URL &&
    !process.env.EXPO_PUBLIC_API_URL.includes('192.168.') &&
    !process.env.EXPO_PUBLIC_API_URL.includes('localhost') &&
    !process.env.EXPO_PUBLIC_API_URL.includes('10.0.')
  ) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // Web check (e.g. if hosted on custom cloud domain)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      !window.location.hostname.startsWith('192.168.')
    ) {
      return window.location.origin;
    }
  }

  // Universal Production Cloud API (Azure App Service)
  // Ensures all mobile devices (cellular, public Wi-Fi, external networks) connect seamlessly
  return PRODUCTION_API_URL;
}

// ─── Network Fetch for MongoDB Atlas API ─────────────────────────────────────
export async function apiFetchWithTimeout<T>(
  path: string,
  body?: object,
  timeoutMs: number = 8000,
  method: string = body ? 'POST' : 'GET'
): Promise<{ data?: T; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const rawSession = await secureGet(KEY_SESSION);
    let token = '';
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession);
        token = parsed.token || '';
      } catch {}
    }

    const base = getApiBase();
    const url = `${base}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { error: json?.error || `Server responded with status ${res.status}` };
    }
    return { data: json as T };
  } catch (err: any) {
    clearTimeout(timer);
    const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
    return { error: isAbort ? 'Connection timed out — please try again' : 'Server unreachable (offline)' };
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  shouldPromptBio: boolean;
  dismissBioPrompt: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  enableBiometric: () => Promise<{ success: boolean; error?: string }>;
  disableBiometric: () => Promise<void>;
  updateProfile: (name: string, newPass?: string, newEmail?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [hasPromptedBioThisSession, setHasPromptedBioThisSession] = useState(false);

  // ── Init: Restore persistent session (0ms offline check) ───────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check biometric hardware
        const hasHW = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricAvailable(hasHW && enrolled);

        // 2. Check if user enabled biometric on this device
        const bioFlag = await secureGet(KEY_BIO_ENABLED);
        setIsBiometricEnabled(bioFlag === 'true');

        // 3. Restore persistent session — user stays logged in until explicit logout!
        const rawSession = await secureGet(KEY_SESSION);
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (session?.user) {
            setUser(session.user);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // ── Register (Syncs with MongoDB Atlas & saves locally) ────────────────────
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const n = name.trim();
        const e = email.trim().toLowerCase();
        if (!n || !e || !password) return { success: false, error: 'All fields required' };
        if (password.length < 4) return { success: false, error: 'Password must be at least 4 characters' };

        const pHash = hashPassword(e, password);

        // 1. Try cloud registration to MongoDB Atlas first
        let remoteUser: User | null = null;
        let remoteToken = 'local_token';
        try {
          const { data, error } = await apiFetchWithTimeout<{ user: User; token: string }>(
            '/api/auth/register',
            { name: n, email: e, password },
            4000
          );
          if (data?.user) {
            remoteUser = data.user;
            remoteToken = data.token;
          } else if (error && error !== 'Offline' && !error.includes('aborted')) {
            // Server reported actual validation/conflict error
            return { success: false, error };
          }
        } catch {}

        const userObj: User = remoteUser || {
          id: uid(),
          email: e,
          name: n,
          createdAt: Date.now(),
        };

        // 2. Save locally immediately
        const rawUsers = await AsyncStorage.getItem(KEY_USERS).catch(() => null);
        const localUsers: Record<string, any> = rawUsers ? JSON.parse(rawUsers) : {};
        localUsers[e] = {
          ...userObj,
          passwordHash: pHash,
          synced: !!remoteUser,
        };
        await AsyncStorage.setItem(KEY_USERS, JSON.stringify(localUsers)).catch(() => {});

        // 3. Save persistent session immediately (user is logged in!)
        await secureSet(KEY_SESSION, JSON.stringify({ user: userObj, token: remoteToken }));
        setUser(userObj);
        setHasPromptedBioThisSession(false);

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Registration failed' };
      }
    },
    []
  );

  // ── Login (Authenticates with MongoDB Atlas or cached credentials) ─────────
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const e = email.trim().toLowerCase();
        if (!e || !password) return { success: false, error: 'Fill in both fields' };
        if (password.length < 4) return { success: false, error: 'Password must be at least 4 characters' };

        const pHash = hashPassword(e, password);

        // 1. Try cloud authentication with MongoDB Atlas
        let remoteUser: User | null = null;
        let remoteToken = 'local_token';
        let serverError = '';

        try {
          const { data, error } = await apiFetchWithTimeout<{ user: User; token: string }>(
            '/api/auth/login',
            { email: e, password },
            5000
          );
          if (data?.user) {
            remoteUser = data.user;
            remoteToken = data.token;
          } else if (error) {
            serverError = error;
          }
        } catch {}

        // If server reported an auth error (e.g. wrong password or user not found)
        if (serverError && serverError !== 'Offline' && !serverError.includes('aborted')) {
          return { success: false, error: serverError };
        }

        // 2. Read local user records
        const rawUsers = await AsyncStorage.getItem(KEY_USERS).catch(() => null);
        const localUsers: Record<string, any> = rawUsers ? JSON.parse(rawUsers) : {};
        let userObj: User;

        if (remoteUser) {
          userObj = remoteUser;
          localUsers[e] = {
            ...userObj,
            passwordHash: pHash,
            synced: true,
          };
          await AsyncStorage.setItem(KEY_USERS, JSON.stringify(localUsers)).catch(() => {});
        } else if (localUsers[e]) {
          // Device is offline, but account was previously logged in on this phone
          if (localUsers[e].passwordHash && localUsers[e].passwordHash !== pHash) {
            return { success: false, error: 'Incorrect password' };
          }
          userObj = {
            id: localUsers[e].id,
            email: localUsers[e].email,
            name: localUsers[e].name,
            createdAt: localUsers[e].createdAt,
          };
        } else {
          // Offline and account does not exist on this device:
          return {
            success: false,
            error:
              serverError === 'Offline'
                ? 'Server unreachable and account not cached on this device.'
                : (serverError || 'Account not found. Please create an account first.')
          };
        }

        // 3. Save persistent session (user stays logged in until explicit logout)
        await secureSet(KEY_SESSION, JSON.stringify({ user: userObj, token: remoteToken }));
        setUser(userObj);
        setHasPromptedBioThisSession(false);

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Login failed' };
      }
    },
    []
  );

  // ── Login with Biometrics (100% Offline via Device Hardware) ──────────────
  const loginWithBiometric = useCallback(async () => {
    if (!isBiometricAvailable) {
      return { success: false, error: 'Biometrics not available on this device' };
    }
    if (!isBiometricEnabled) {
      return { success: false, error: 'Biometric login not set up' };
    }

    // Authenticate with device sensor
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Suwan's FundManager",
      fallbackLabel: 'Use password instead',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      return { success: false, error: 'Biometric verification cancelled' };
    }

    // Retrieve stored biometric user & token
    const bioUserRaw = await secureGet(KEY_BIO_USER);
    if (!bioUserRaw) {
      return {
        success: false,
        error: 'No biometric account found — please login with password',
      };
    }

    let bioUser: User;
    let bioToken = 'local_token';
    try {
      const parsed = JSON.parse(bioUserRaw);
      if (parsed.user) {
        bioUser = parsed.user;
        bioToken = parsed.token || 'local_token';
      } else {
        bioUser = parsed; // backwards compatibility
      }
    } catch {
      return { success: false, error: 'Corrupt biometric record — please login with password' };
    }

    await secureSet(KEY_SESSION, JSON.stringify({ user: bioUser, token: bioToken }));
    setUser(bioUser);
    return { success: true };
  }, [isBiometricAvailable, isBiometricEnabled]);

  // ── Enable Biometric ──────────────────────────────────────────────────────
  const enableBiometric = useCallback(async () => {
    if (!isBiometricAvailable) {
      return { success: false, error: 'Biometrics not available on this device' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm fingerprint or face to enable biometric login',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      return { success: false, error: 'Biometric confirmation cancelled' };
    }

    if (!user) return { success: false, error: 'No active session' };

    // Extract current token from active session so biometric restore preserves cloud JWT
    const rawSession = await secureGet(KEY_SESSION);
    let sessionToken = 'local_token';
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession);
        if (parsed.token) sessionToken = parsed.token;
      } catch {}
    }

    await secureSet(KEY_BIO_USER, JSON.stringify({ user, token: sessionToken }));
    await secureSet(KEY_BIO_ENABLED, 'true');
    setIsBiometricEnabled(true);
    setHasPromptedBioThisSession(true);

    return { success: true };
  }, [isBiometricAvailable, user]);

  // ── Disable Biometric ─────────────────────────────────────────────────────
  const disableBiometric = useCallback(async () => {
    await secureDelete(KEY_BIO_USER);
    await secureSet(KEY_BIO_ENABLED, 'false');
    setIsBiometricEnabled(false);
  }, []);

  // ── Dismiss Biometric Prompt For Current Session ──────────────────────────
  const dismissBioPrompt = useCallback(() => {
    setHasPromptedBioThisSession(true);
  }, []);

  // ── Update Profile (Name, Password, Email) ────────────────────────────────
  const updateProfile = useCallback(
    async (name: string, newPass?: string, newEmail?: string) => {
      if (!user) return { success: false, error: 'Not authenticated' };

      const cleanName = name.trim();
      const cleanEmail = (newEmail || user.email).trim().toLowerCase();
      if (!cleanName) return { success: false, error: 'Name cannot be empty' };
      if (!cleanEmail) return { success: false, error: 'Email cannot be empty' };

      const updatedUser: User = { ...user, name: cleanName, email: cleanEmail };

      // Update locally
      const rawUsers = await AsyncStorage.getItem(KEY_USERS).catch(() => null);
      const localUsers: Record<string, any> = rawUsers ? JSON.parse(rawUsers) : {};

      const existingHash = localUsers[user.email]?.passwordHash || '';
      const pHash = newPass ? hashPassword(cleanEmail, newPass) : existingHash;

      delete localUsers[user.email];
      localUsers[cleanEmail] = {
        ...updatedUser,
        passwordHash: pHash,
      };
      await AsyncStorage.setItem(KEY_USERS, JSON.stringify(localUsers)).catch(() => {});

      await secureSet(KEY_SESSION, JSON.stringify({ user: updatedUser, token: 'profile_token' }));
      if (isBiometricEnabled) {
        await secureSet(KEY_BIO_USER, JSON.stringify(updatedUser));
      }
      setUser(updatedUser);

      // Sync update to MongoDB Atlas in background
      apiFetchWithTimeout('/api/auth/profile', {
        userId: user.id,
        name: cleanName,
        email: user.email,
        newEmail: cleanEmail !== user.email ? cleanEmail : undefined,
        password: newPass,
      }, 4000).catch(() => {});

      return { success: true };
    },
    [user, isBiometricEnabled]
  );

  // ── Logout (Clears session only, leaves biometric user intact) ────────────
  const logout = useCallback(async () => {
    await secureDelete(KEY_SESSION);
    setUser(null);
  }, []);

  const shouldPromptBio =
    !!user && isBiometricAvailable && !isBiometricEnabled && !hasPromptedBioThisSession;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isBiometricAvailable,
        isBiometricEnabled,
        shouldPromptBio,
        dismissBioPrompt,
        login,
        register,
        loginWithBiometric,
        enableBiometric,
        disableBiometric,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
