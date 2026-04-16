import { ConfirmDialogModal } from '@/components/confirm-dialog-modal';

type DeleteCityModalProps = {
  visible: boolean;
  cityName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCityModal({ visible, cityName, onClose, onConfirm }: DeleteCityModalProps) {
  const title = `Delete "${cityName}"\nand all of its notifications?`;

  return (
    <ConfirmDialogModal
      visible={visible}
      title={title}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
