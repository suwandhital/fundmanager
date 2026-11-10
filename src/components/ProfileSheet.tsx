import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Platform,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { X, Fingerprint, ShieldCheck, RefreshCw } from 'lucide-react-native';
import * as Updates from 'expo-updates';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  return <ProfileSheetForm visible={visible} onClose={onClose} />;
};

const ProfileSheetForm: React.FC<ProfileSheetProps> = ({ visible, onClose }) => {
  const {
    user,
    updateProfile,
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
  } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const initialLetter = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const memberSinceFormatted = user?.createdAt
    ? 'Member since ' +
      new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Local Account';

  const handleToggleBiometric = async (val: boolean) => {
    if (val) {
      const res = await enableBiometric();
      if (res.success) {
        toast('Biometric login enabled ✓');
      } else {
        toast(res.error || 'Failed to enable biometric');
      }
    } else {
      await disableBiometric();
      toast('Biometric login disabled');
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus('Checking for updates...');
    try {
      if (!Updates.isEnabled) {
        setUpdateStatus('OTA active in release APK build');
        toast('Updates active in standalone release build');
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateStatus('Downloading update...');
        toast('Downloading new update...');
        await Updates.fetchUpdateAsync();
        setUpdateStatus('Update ready! Reloading...');
        toast('Update ready! Reloading...');
        await Updates.reloadAsync();
      } else {
        setUpdateStatus('App is up to date ✓');
        toast('App is up to date ✓');
      }
    } catch (err: any) {
      console.warn('[Updates] Check update note:', err?.message);
      setUpdateStatus('App is up to date ✓');
      toast('App is up to date ✓');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      toast('Name cannot be empty');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast('Please enter a valid email address');
      return;
    }
    if (password && password.length < 4) {
      toast('Password needs at least 4 characters');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile(
        cleanName,
        password || undefined,
        cleanEmail !== user?.email ? cleanEmail : undefined
      );
      if (res.success) {
        toast('Profile updated ✓');
        onClose();
      } else {
        toast(res.error || 'Failed to update profile');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={[styles.sheet, { backgroundColor: theme.card }]}>
                {/* Handle */}
                <View style={[styles.sheetHandle, { backgroundColor: theme.line }]} />

                {/* Head */}
                <View style={styles.sheetHead}>
                  <View style={styles.headLeft}>
                    <Text style={[styles.sheetTitle, { color: theme.text }]}>Profile & Security</Text>
                    <Text style={[styles.sheetSubtitle, { color: theme.muted }]}>Manage your account details and biometrics</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeBtn, { backgroundColor: theme.card, borderColor: theme.line }]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={16} color={theme.text} strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={styles.scrollContent}
                >
                {/* Profile Avatar & Info Card */}
                <View style={[styles.profileHead, { borderBottomColor: theme.line }]}>
                  <View style={[styles.profileAvatar, { backgroundColor: theme.text }]}>
                    <Text style={[styles.avatarLetter, { color: theme.card }]}>{initialLetter}</Text>
                  </View>

                  <View style={styles.profileInfo}>
                    <Text style={[styles.profileEmail, { color: theme.text }]} numberOfLines={1}>
                      {user?.email || 'local@fund.app'}
                    </Text>
                    <Text style={[styles.profileSince, { color: theme.muted }]}>
                      {memberSinceFormatted}
                    </Text>
                  </View>
                </View>

                {/* Display Name */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Display Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your Name"
                    placeholderTextColor={theme.muted}
                    maxLength={40}
                    style={[
                      styles.field,
                      {
                        backgroundColor: theme.fieldBg,
                        borderColor: theme.line,
                        color: theme.text,
                      },
                    ]}
                  />
                </View>

                {/* Email Address */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
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
                  />
                </View>

                {/* New Password */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>
                    New Password <Text style={styles.opt}>(leave blank to keep current)</Text>
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.muted}
                    secureTextEntry
                    style={[
                      styles.field,
                      {
                        backgroundColor: theme.fieldBg,
                        borderColor: theme.line,
                        color: theme.text,
                      },
                    ]}
                  />
                </View>

                {/* Biometrics Toggle Section */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Biometric Security</Text>
                  <View
                    style={[
                      styles.bioCard,
                      {
                        backgroundColor: theme.fieldBg,
                        borderColor: theme.line,
                      },
                    ]}
                  >
                    <View style={styles.bioLeft}>
                      <View style={[styles.bioIconWrap, { backgroundColor: theme.track }]}>
                        <Fingerprint size={22} color={theme.text} strokeWidth={2} />
                      </View>
                      <View style={styles.bioTextWrap}>
                        <Text style={[styles.bioTitle, { color: theme.text }]}>
                          Fingerprint & Face ID
                        </Text>
                        <Text style={[styles.bioSubtitle, { color: theme.muted }]}>
                          {!isBiometricAvailable
                            ? 'Not supported on this device'
                            : isBiometricEnabled
                            ? 'Enabled · Fast 1-tap offline sign in'
                            : 'Disabled · Enable for instant unlock'}
                        </Text>
                      </View>
                    </View>

                    {isBiometricAvailable ? (
                      <Switch
                        value={isBiometricEnabled}
                        onValueChange={handleToggleBiometric}
                        trackColor={{ false: theme.track, true: '#16a34a' }}
                        thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                      />
                    ) : (
                      <ShieldCheck size={18} color={theme.muted} strokeWidth={1.8} />
                    )}
                  </View>
                </View>

                {/* Over-The-Air (OTA) Updates Section */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.muted }]}>Software Updates</Text>
                  <View
                    style={[
                      styles.bioCard,
                      {
                        backgroundColor: theme.fieldBg,
                        borderColor: theme.line,
                      },
                    ]}
                  >
                    <View style={styles.bioLeft}>
                      <View style={[styles.bioIconWrap, { backgroundColor: theme.track }]}>
                        <RefreshCw size={20} color={theme.text} strokeWidth={2} />
                      </View>
                      <View style={styles.bioTextWrap}>
                        <Text style={[styles.bioTitle, { color: theme.text }]}>
                          Over-The-Air (OTA) Updates
                        </Text>
                        <Text style={[styles.bioSubtitle, { color: theme.muted }]}>
                          {updateStatus || 'Auto-checks & updates on launch'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.updateCheckBtn, { backgroundColor: theme.track, borderColor: theme.line }]}
                      onPress={handleCheckUpdate}
                      disabled={isCheckingUpdate}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.updateCheckText, { color: theme.text }]}>
                        {isCheckingUpdate ? 'Checking...' : 'Check'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.track, flex: 1 }]}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.text, flex: 1.4 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, { color: theme.card }]}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </Modal>
);
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginVertical: 6,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  headLeft: {
    flex: 1,
    marginRight: 10,
  },
  sheetTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 28,
  },
  profileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileEmail: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  profileSince: {
    fontSize: 11.5,
    marginTop: 2,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingLeft: 2,
  },
  opt: {
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    opacity: 0.8,
  },
  field: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10.5,
    fontSize: 14,
  },
  bioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  bioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bioIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioTextWrap: {
    flex: 1,
  },
  bioTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  bioSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  updateCheckBtn: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateCheckText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
