import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type DeleteNotificationModalProps = {
  visible: boolean;
  notificationTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteNotificationModal({
  visible,
  notificationTitle,
  onClose,
  onConfirm,
}: DeleteNotificationModalProps) {
  const body = notificationTitle
    ? `Delete notification "${notificationTitle}"?`
    : 'Delete this notification?';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          <Text style={styles.title}>Delete Notification</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={onConfirm}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(62, 63, 86, 0.98)',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: '#d4d6df',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
