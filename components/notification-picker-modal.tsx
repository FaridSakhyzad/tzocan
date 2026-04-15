import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ImageBackground } from 'react-native';

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';

type NotificationPickerModalProps = {
  visible: boolean;
  title: string | null;
  onClose: () => void;
  onApply?: () => void;
  showActions?: boolean;
  wide?: boolean;
  children: ReactNode;
};

export function NotificationPickerModal({
  visible,
  title,
  onClose,
  onApply,
  showActions = true,
  wide = false,
  children,
}: NotificationPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, wide && styles.cardWide]} onPress={() => undefined}>
          <ImageBackground
            source={require('@/assets/images/bg--main-1.jpg')}
            style={styles.backgroundImage}
            imageStyle={styles.backgroundImageAsset}
            resizeMode="cover"
          >
            <View style={styles.container}>
              <View style={styles.header}>
                {showActions && (
                  <Pressable style={styles.headerButton} onPress={onClose}>
                    <IconCancelOutlined fill="white" />
                  </Pressable>
                )}

                <Text style={styles.title}>{title}</Text>

                {showActions && (
                  <Pressable style={styles.headerButton} onPress={onApply}>
                    <IconConfirmOutlined fill="white" />
                  </Pressable>
                )}
              </View>

              {children}
            </View>
          </ImageBackground>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(62, 63, 86, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(62, 63, 86, 0)',
  },
  cardWide: {
    maxHeight: '90%',
    width: '100%',
    paddingHorizontal: 20,
  },
  backgroundImage: {
    borderTopLeftRadius: 33,
    borderTopRightRadius: 33,
    borderBottomLeftRadius: 27,
    borderBottomRightRadius: 27,
    overflow: 'hidden',
  },
  backgroundImageAsset: {
    transform: [{ scale: 2 }],
  },
  container: {
    backgroundColor: 'rgba(62, 63, 86, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20
  },
  headerButton: {
    width: 30,
    height: 30,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    margin: 'auto'
  },
});
