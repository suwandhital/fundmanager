import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Moon, Sun, LogOut, User as UserIcon } from 'lucide-react-native';
import { ProfileSheet } from './ProfileSheet';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, themeMode, toggleTheme } = useTheme();
  const [profileVisible, setProfileVisible] = useState(false);

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const isDark = themeMode === 'dark';

  return (
    <View style={styles.header}>
      <View style={styles.titleWrap}>
        <Text style={[styles.welcomeText, { color: theme.muted }]}>
          Welcome back
        </Text>
        <Text
          style={[styles.userName, { color: theme.text }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Dark Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          {isDark
            ? <Sun size={17} color={theme.text} strokeWidth={2} />
            : <Moon size={17} color={theme.text} strokeWidth={2} />
          }
        </TouchableOpacity>

        {/* Profile Button */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
          onPress={() => setProfileVisible(true)}
          activeOpacity={0.7}
        >
          <UserIcon size={17} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: theme.card, borderColor: theme.line },
          ]}
          onPress={logout}
          activeOpacity={0.7}
        >
          <LogOut size={17} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Profile & Biometrics Management Sheet */}
      <ProfileSheet
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  welcomeText: {
    fontSize: 11.5,
    margin: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
});
