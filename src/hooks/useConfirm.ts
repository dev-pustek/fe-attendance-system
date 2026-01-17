import { useState, useCallback } from 'react';
import { ConfirmVariant } from '../components/molecules/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  message?: string;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export const useConfirm = () => {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    resolve: null,
    variant: 'warning',
  });

  const confirm = useCallback((options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        resolve,
        title: options.title,
        message: options.message,
        variant: options.variant || 'warning',
        confirmText: options.confirmText,
        cancelText: options.cancelText,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state.resolve) {
      state.resolve(true);
    }
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    if (state.resolve) {
      state.resolve(false);
    }
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  return {
    confirm,
    confirmState: {
      isOpen: state.isOpen,
      onConfirm: handleConfirm,
      onClose: handleCancel,
      title: state.title,
      message: state.message,
      variant: state.variant,
      confirmText: state.confirmText,
      cancelText: state.cancelText,
    },
  };
};
