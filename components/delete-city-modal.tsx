import { ConfirmDialogModal } from '@/components/confirm-dialog-modal';
import { useI18n } from '@/hooks/use-i18n';

type DeleteCityModalProps = {
  visible: boolean;
  cityName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCityModal({ visible, cityName, onClose, onConfirm }: DeleteCityModalProps) {
  const { t } = useI18n();
  const title = t('delete.cityTitle', { name: cityName });

  return (
    <ConfirmDialogModal
      visible={visible}
      title={title}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
