import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../context/TransactionContext';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  User,
  Moon,
  Sun,
  RefreshCw,
  Download,
  Upload,
  History,
  Trash2,
  LogOut,
} from 'lucide-react-native';

interface MenuPopupProps {
  visible: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

export const MenuPopup: React.FC<MenuPopupProps> = ({
  visible,
  onClose,
  onOpenProfile,
}) => {
  const { logout } = useAuth();
  const { syncNow, reloadSampleData, clearAllData, exportBackup, importBackup } = useTransactions();
  const { themeMode, theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  if (!visible) return null;

  const handleExport = () => {
    onClose();
    const backup = exportBackup();
    if (!backup) {
      toast('No transactions to export');
      return;
    }

    if (Platform.OS === 'web') {
      try {
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const todayStr = new Date().toISOString().slice(0, 10);
        a.download = `fund-backup-${todayStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Backup downloaded');
      } catch {
        toast('Export failed');
      }
    } else {
      toast('Backup exported to local storage');
    }
  };

  const handleImport = () => {
    onClose();
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e: any) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          try {
            const data = JSON.parse(ev.target.result);
            importBackup(data);
          } catch (err: any) {
            toast('Import failed: ' + err.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } else {
      toast('File import is supported on Web and local backups');
    }
  };

  const handleClear = () => {
    onClose();
    if (Platform.OS === 'web') {
      if (window.confirm('Delete all transactions? This cannot be undone.')) {
        clearAllData();
      }
    } else {
      Alert.alert(
        'Clear All Data',
        'Delete all transactions? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete All', style: 'destructive', onPress: () => clearAllData() },
        ]
      );
    }
  };

  const handleLogout = () => {
    onClose();
    if (Platform.OS === 'web') {
      if (window.confirm('Log out of your account?')) {
        logout();
      }
    } else {
      Alert.alert(
        'Log out',
        'Log out of your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log out', style: 'destructive', onPress: () => logout() },
        ]
      );
    }
  };

  const handleReloadSample = () => {
    onClose();
    if (Platform.OS === 'web') {
      if (window.confirm('Replace current transactions with fresh sample data?')) {
        reloadSampleData();
      }
    } else {
      Alert.alert(
        'Reload Sample Data',
        'Replace current transactions with fresh sample data?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reload', onPress: () => reloadSampleData() },
        ]
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View
              style={[
                styles.popover,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.line,
                },
              ]}
            >
              {/* Profile */}
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  onOpenProfile();
                }}
                activeOpacity={0.7}
              >
                <User size={15} color={theme.muted} />
                <Text style={[styles.itemText, { color: theme.text }]}>My profile</Text>
              </TouchableOpacity>

              {/* Theme Toggle */}
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  toggleTheme();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                {themeMode === 'dark' ? (
                  <Sun size={15} color={theme.muted} />
                ) : (
                  <Moon size={15} color={theme.muted} />
                )}
                <Text style={[styles.itemText, { color: theme.text }]}>
                  {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.separator, { backgroundColor: theme.line }]} />

              {/* Sync now */}
              <TouchableOpacity
                style={styles.item}
                onPress={() => {
                  onClose();
                  syncNow();
                }}
                activeOpacity={0.7}
              >
                <RefreshCw size={15} color={theme.muted} />
                <Text style={[styles.itemText, { color: theme.text }]}>Sync now</Text>
              </TouchableOpacity>

              {/* Export backup */}
              <TouchableOpacity style={styles.item} onPress={handleExport} activeOpacity={0.7}>
                <Download size={15} color={theme.muted} />
                <Text style={[styles.itemText, { color: theme.text }]}>Export backup</Text>
              </TouchableOpacity>

              {/* Import backup */}
              <TouchableOpacity style={styles.item} onPress={handleImport} activeOpacity={0.7}>
                <Upload size={15} color={theme.muted} />
                <Text style={[styles.itemText, { color: theme.text }]}>Import backup</Text>
              </TouchableOpacity>

              {/* Reload sample */}
              <TouchableOpacity style={styles.item} onPress={handleReloadSample} activeOpacity={0.7}>
                <History size={15} color={theme.muted} />
                <Text style={[styles.itemText, { color: theme.text }]}>Reload sample data</Text>
              </TouchableOpacity>

              <View style={[styles.separator, { backgroundColor: theme.line }]} />

              {/* Clear all */}
              <TouchableOpacity style={styles.item} onPress={handleClear} activeOpacity={0.7}>
                <Trash2 size={15} color={theme.expense} />
                <Text style={[styles.itemText, { color: theme.expense }]}>Clear all data</Text>
              </TouchableOpacity>

              {/* Logout */}
              <TouchableOpacity style={styles.item} onPress={handleLogout} activeOpacity={0.7}>
                <LogOut size={15} color={theme.expense} />
                <Text style={[styles.itemText, { color: theme.expense }]}>Log out</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 54,
    paddingRight: 18,
  },
  popover: {
    width: 224,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  itemText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginVertical: 5,
    marginHorizontal: 8,
  },
});

