import React, { useCallback, useState } from 'react';
import { CyberModal, CyberModalButton } from '../components/CyberModal';

interface DialogState {
  title: string;
  message: string;
  buttons: CyberModalButton[];
}

export const useCyberAlert = () => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const close = useCallback(() => setDialog(null), []);

  const show = useCallback((
    title: string,
    message: string,
    buttons?: CyberModalButton[],
  ) => {
    setDialog({
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
    });
  }, []);

  const modal = (
    <CyberModal
      visible={dialog !== null}
      title={dialog?.title || ''}
      message={dialog?.message || ''}
      buttons={dialog?.buttons.map((button) => ({
        ...button,
        onPress: () => {
          close();
          button.onPress?.();
        },
      }))}
      onClose={close}
    />
  );

  return { showCyberAlert: show, cyberAlertModal: modal };
};
