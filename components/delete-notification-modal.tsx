import { ConfirmDialogModal } from '@/components/confirm-dialog-modal';

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
  const title = notificationTitle
    ? `Delete notification\n"${notificationTitle}"?`
    : 'Delete this notification?';

  return (
    <ConfirmDialogModal
      visible={visible}
      title={title}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
