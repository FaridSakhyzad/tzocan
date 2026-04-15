import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ImageBackground
} from 'react-native';

import CloseButton from '../assets/images/icon--x-3--outlined.svg';

type MainMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddNotification: () => void;
  onAddCity: () => void;
  onContact: () => void;
  onSettings: () => void;
  onAbout: () => void;
  canAddNotification?: boolean;
};

export function MainMenuModal({
  visible,
  onClose,
  onAddNotification,
  onAddCity,
  onContact,
  onSettings,
  onAbout,
  canAddNotification = true,
}: MainMenuModalProps) {
  const handleAddNotification = () => {
    onClose();
    onAddNotification();
  };

  const handleAddCity = () => {
    onClose();
    onAddCity();
  };

  const handleOpenContact = () => {
    onClose();
    onContact();
  };

  const handleOpenSettings = () => {
    onClose();
    onSettings();
  };

  const handleOpenAbout = () => {
    onClose();
    onAbout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      style={styles.mainMenuModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalTop}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <CloseButton fill="rgba(255, 255, 255, 1)" />
          </Pressable>
        </View>
        <ImageBackground
          source={require('@/assets/images/bg--main-1.jpg')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageAsset}
          resizeMode="cover"
        >
          <View style={styles.modalContent}>
            <View style={styles.menuCard}>
              <Pressable
                style={[styles.menuButton, !canAddNotification && styles.menuButtonDisabled]}
                onPress={handleAddNotification}
                disabled={!canAddNotification}
              >
                <Text style={styles.menuButtonText}>Add Notification</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleAddCity}>
                <Text style={styles.menuButtonText}>Add City</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleOpenSettings}>
                <Text style={styles.menuButtonText}>Settings</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleOpenContact}>
                <Text style={styles.menuButtonText}>Contact</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleOpenAbout}>
                <Text style={styles.menuButtonText}>About</Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
        <View style={styles.modalTop} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mainMenuModal: {},
  modalContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(62, 63, 86, 0.9)',
    padding: 40,
  },
  modalTop: {
    flex: 1,
  },
  modalBottom: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 'auto'
  },
  backgroundImage: {
    display: 'flex',
    borderRadius: 20,
    overflow: 'hidden'
  },
  backgroundImageAsset: {
    transform: [{ scale: 2 }],
  },
  modalContent: {
    backgroundColor: 'rgba(62, 63, 86, 0)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 23,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuCard: {
    flexDirection: 'column',
    gap: 10,
  },
  menuButton: {
    height: 40,
    justifyContent: 'center',
  },
  menuButtonDisabled: {
    opacity: 0.5,
  },
  menuButtonText: {
    fontSize: 22,
    color: '#fff',
  },
});
