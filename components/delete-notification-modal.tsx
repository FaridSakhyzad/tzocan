import { ConfirmDialogModal } from '@/components/confirm-dialog-modal';
import { useI18n } from '@/hooks/use-i18n';

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
  const { t } = useI18n();
  const title = notificationTitle
    ? t('delete.notificationTitleNamed', { name: notificationTitle })
    : t('delete.notificationTitleUnnamed');

  return (
    <ConfirmDialogModal
      visible={visible}
      title={title}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
