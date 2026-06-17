import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, PanInfo } from "framer-motion";

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
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm dark:bg-black/80"
        >
          <motion.div
            initial={{ y: "100%", scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.95 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={`relative w-full bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-3xl shadow-xl flex flex-col max-h-[90vh] ${className}`}
          >
            {/* Mobile Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing touch-none">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>

            {/* Header */}
            {title && (
              <div className="flex-none flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] touch-none select-none">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                  {description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onClose();
                  }}
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
            <div 
              className="flex-1 overflow-y-auto p-6"
              onPointerDownCapture={(e) => e.stopPropagation()} 
            >
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex-none border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-white/[0.05] dark:bg-white/[0.01] rounded-b-3xl">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
