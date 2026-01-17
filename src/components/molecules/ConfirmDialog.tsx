import React from 'react';
import { CloseIcon, AlertIcon, CheckCircleIcon, InfoIcon, TrashBinIcon } from '../atoms/Icons';

export type ConfirmVariant = 'delete' | 'update' | 'create' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'warning',
  confirmText,
  cancelText = 'Cancel',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'delete':
        return {
          icon: <TrashBinIcon className="size-6" />,
          iconBg: 'bg-red-100 dark:bg-red-500/10',
          iconColor: 'text-red-600 dark:text-red-500',
          title: title || 'Confirm Deletion',
          message: message || 'Are you sure you want to delete this item? This action cannot be undone.',
          confirmText: confirmText || 'Delete',
          confirmBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        };
      case 'update':
        return {
          icon: <CheckCircleIcon className="size-6" />,
          iconBg: 'bg-blue-100 dark:bg-blue-500/10',
          iconColor: 'text-blue-600 dark:text-blue-500',
          title: title || 'Confirm Update',
          message: message || 'Are you sure you want to update this item?',
          confirmText: confirmText || 'Update',
          confirmBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        };
      case 'create':
        return {
          icon: <CheckCircleIcon className="size-6" />,
          iconBg: 'bg-green-100 dark:bg-green-500/10',
          iconColor: 'text-green-600 dark:text-green-500',
          title: title || 'Confirm Creation',
          message: message || 'Are you sure you want to create this item?',
          confirmText: confirmText || 'Create',
          confirmBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
        };
      case 'info':
        return {
          icon: <InfoIcon className="size-6" />,
          iconBg: 'bg-gray-100 dark:bg-gray-500/10',
          iconColor: 'text-gray-600 dark:text-gray-400',
          title: title || 'Confirmation',
          message: message || 'Please confirm this action.',
          confirmText: confirmText || 'Confirm',
          confirmBg: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
        };
      default: // warning
        return {
          icon: <AlertIcon className="size-6" />,
          iconBg: 'bg-yellow-100 dark:bg-yellow-500/10',
          iconColor: 'text-yellow-600 dark:text-yellow-500',
          title: title || 'Warning',
          message: message || 'Please confirm this action.',
          confirmText: confirmText || 'Confirm',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        };
    }
  };

  const styles = getVariantStyles();

  const handleConfirm = () => {
    onConfirm();
    // Don't close immediately if loading, let parent handle it on success
    if (!isLoading) {
       onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-[1000000] w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <CloseIcon className="size-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${styles.iconBg} ${styles.iconColor} mb-4`}>
            {styles.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {styles.title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {styles.message}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 ${styles.confirmBg}`}
            >
              {isLoading ? "Processing..." : styles.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
