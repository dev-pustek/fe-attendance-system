import React from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800/50">
        <h3 className="text-base font-bold text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {desc && (
          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{desc}</p>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
};

export default ComponentCard;
