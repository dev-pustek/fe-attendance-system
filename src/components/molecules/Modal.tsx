import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  subHeader?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  title,
  description,
  footer,
  subHeader,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is on the backdrop (the outer div)
      // The outer div is where we attached the listener? No.
      // We check if modalRef "contains" the target.
      // However, we want to close if the click is OUTSIDE modalRef.
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (target.closest(".flatpickr-calendar")) {
          return;
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // We should attach mousedown to the document or the backdrop?
      // Currently it's on document.
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm dark:bg-black/80">
      <div
        ref={modalRef}
        className={`relative w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl flex flex-col max-h-[90vh] ${className}`}
      >
        {/* Header */}
        {title && (
          <div className="flex-none flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/[0.05]">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              {description && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/[0.05]"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Sub Header */}
        {subHeader && (
          <div className="flex-none border-b border-gray-100 dark:border-white/[0.05]">
             {subHeader}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-none border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-white/[0.05] dark:bg-white/[0.01] rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
