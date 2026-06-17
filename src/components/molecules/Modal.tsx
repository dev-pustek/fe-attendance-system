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
  const [isRendered, setIsRendered] = React.useState(isOpen);
  const [isVisible, setIsVisible] = React.useState(isOpen);

  // Drag state
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [closingFromDrag, setClosingFromDrag] = React.useState(false);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
    setClosingFromDrag(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;
    
    // Only allow dragging downwards
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (dragY > 100) {
      setClosingFromDrag(true);
      onClose();
    } else {
      setDragY(0);
      setTimeout(() => setClosingFromDrag(false), 300);
    }
  };

  // Cache contents to prevent collapse during exit animation
  const cachedContent = useRef({ children, title, description, subHeader, footer });

  if (isOpen) {
    cachedContent.current = { children, title, description, subHeader, footer };
  }

  const displayChildren = isOpen ? children : cachedContent.current.children;
  const displayTitle = isOpen ? title : cachedContent.current.title;
  const displayDescription = isOpen ? description : cachedContent.current.description;
  const displaySubHeader = isOpen ? subHeader : cachedContent.current.subHeader;
  const displayFooter = isOpen ? footer : cachedContent.current.footer;

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setDragY(0);
      setClosingFromDrag(false);
      setIsDragging(false);
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsVisible(false);
      const timeoutId = setTimeout(() => {
        setIsRendered(false);
      }, 400); // Buffer to ensure 300ms CSS animation finishes
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Do nothing on outside click
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isRendered) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm dark:bg-black/80 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div
        ref={modalRef}
        className={`relative w-full bg-white dark:bg-gray-900 rounded-t-[2rem] sm:rounded-3xl shadow-xl flex flex-col max-h-[90vh] ${(!isDragging && !closingFromDrag) ? (isVisible ? 'animate-slide-up sm:animate-none sm:scale-100 sm:opacity-100' : 'animate-slide-down sm:animate-none sm:scale-95 sm:opacity-0') : ''} sm:transition-all sm:duration-300 sm:ease-out ${className}`}
        style={{
          transform: isDragging ? `translateY(${dragY}px)` : (closingFromDrag ? 'translateY(100%)' : (dragY > 0 ? 'translateY(0)' : undefined)),
          transition: isDragging ? 'none' : (dragY > 0 || closingFromDrag ? 'transform 0.3s linear' : undefined)
        }}
      >
        {/* Mobile Drag Handle */}
        <div 
          className="w-full flex justify-center pt-3 pb-1 sm:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
        </div>

        {/* Header */}
        {displayTitle && (
          <div 
            className="flex-none flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/[0.05] touch-none select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{displayTitle}</h3>
              {displayDescription && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{displayDescription}</p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
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
        {displaySubHeader && (
          <div className="flex-none border-b border-gray-100 dark:border-white/[0.05]">
             {displaySubHeader}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {displayChildren}
        </div>

        {/* Footer */}
        {displayFooter && (
          <div className="flex-none border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-white/[0.05] dark:bg-white/[0.01] rounded-b-3xl">
            {displayFooter}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
