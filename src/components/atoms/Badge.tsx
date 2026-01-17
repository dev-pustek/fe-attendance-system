import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "light" | "solid";
  color?: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";
  size?: "sm" | "md";
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  className = "",
}) => {
  const colorClasses = {
    primary:
      variant === "light"
        ? "bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
        : "bg-brand-500 text-white",
    success:
      variant === "light"
        ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500"
        : "bg-success-500 text-white",
    error:
      variant === "light"
        ? "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-500"
        : "bg-error-500 text-white",
    warning:
      variant === "light"
        ? "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500"
        : "bg-warning-500 text-white",
    info:
      variant === "light"
        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500"
        : "bg-blue-500 text-white",
    light:
      variant === "light"
        ? "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400"
        : "bg-gray-100 text-gray-700",
    dark: "bg-gray-800 text-white dark:bg-white/10 dark:text-white",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-theme-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded-full ${colorClasses[color]} ${sizeClasses[size]} ${className}`}
    >
      {startIcon && <span className="flex-shrink-0">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex-shrink-0">{endIcon}</span>}
    </span>
  );
};

export default Badge;
