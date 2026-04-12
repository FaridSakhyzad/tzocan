import { useEffect, useState } from 'react';
import { Linking, Modal, View, Text, StyleSheet, Switch, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSettings } from '@/contexts/settings-context';

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { timeFormat, setTimeFormat } = useSettings();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);

  const refreshNotificationPermission = async () => {
    const permission = await Notifications.getPermissionsAsync();
    setPermissionGranted(permission.granted);
    setPermissionCanAskAgain(permission.canAskAgain);
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    refreshNotificationPermission();
  }, [visible]);

  const handleEnableNotifications = async () => {
    setIsPermissionLoading(true);

    try {
      const permission = await Notifications.requestPermissionsAsync();
      setPermissionGranted(permission.granted);
      setPermissionCanAskAgain(permission.canAskAgain);
    } finally {
      setIsPermissionLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    await Linking.openSettings();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>24-hour format</Text>
              <Text style={styles.settingHint}>
                {timeFormat === '24h' ? 'Using 24-hour format (e.g., 14:30)' : 'Using 12-hour format (e.g., 2:30 PM)'}
              </Text>
            </View>
            <Switch
              value={timeFormat === '24h'}
              onValueChange={(value) => setTimeFormat(value ? '24h' : '12h')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor="white"
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingHint}>
                {permissionGranted
                  ? 'Notifications are enabled.'
                  : permissionCanAskAgain
                    ? 'Enable notifications to activate alerts from the app.'
                    : 'Notifications are blocked. Open system settings to enable them again.'}
              </Text>
            </View>

            {permissionGranted !== true && (
              <Pressable
                style={styles.permissionButton}
                onPress={permissionCanAskAgain ? handleEnableNotifications : handleOpenSettings}
                disabled={isPermissionLoading}
              >
                <Text style={styles.permissionButtonText}>
                  {isPermissionLoading
                    ? 'Loading...'
                    : permissionCanAskAgain
                      ? 'Enable Notifications'
                      : 'Open Settings'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(62, 63, 86, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '35%',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#9a9bb2',
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 75, 99, 0.7)',
    padding: 16,
    borderRadius: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingHint: {
    fontSize: 13,
    color: '#9a9bb2',
    marginTop: 4,
  },
  settingCard: {
    backgroundColor: 'rgba(74, 75, 99, 0.7)',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  permissionButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  permissionButtonText: {
    color: 'rgba(62, 63, 86, 1)',
    fontSize: 14,
    fontWeight: '600',
  },
});
