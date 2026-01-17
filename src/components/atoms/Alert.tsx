import React from "react";

interface AlertProps {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  message?: string;
  children?: React.ReactNode;
  showLink?: boolean;
  linkHref?: string;
  linkText?: string;
  onClose?: () => void;
  className?: string;
}

const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  children,
  showLink = false,
  linkHref = "#",
  linkText = "Learn more",
  onClose,
  className = "",
}) => {
  const variantClasses = {
    success:
      "bg-success-50 text-success-800 border-success-200 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/20",
    error:
      "bg-error-50 text-error-800 border-error-200 dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/20",
    warning:
      "bg-warning-50 text-warning-800 border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20",
    info: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  };

  return (
    <div
      className={`relative p-4 mb-4 text-sm border rounded-xl ${variantClasses[variant]} ${className}`}
    >
      <div className="flex flex-col gap-1">
        {title && <span className="font-semibold">{title}</span>}
        <div>
          {message || children}
          {showLink && (
            <a
              href={linkHref}
              className="ml-2 font-medium underline hover:no-underline"
            >
              {linkText}
            </a>
          )}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
        >
          <span className="sr-only">Close</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Alert;
