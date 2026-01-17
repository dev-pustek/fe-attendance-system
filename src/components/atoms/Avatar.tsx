import React from "react";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";
  className?: string;
  status?: "online" | "offline" | "busy";
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "avatar",
  size = "medium",
  className = "",
  status,
}) => {
  const sizeClasses = {
    xsmall: "w-6 h-6",
    small: "w-8 h-8",
    medium: "w-10 h-10",
    large: "w-12 h-12",
    xlarge: "w-16 h-16",
    xxlarge: "w-20 h-20",
  };

  const statusSizeClasses = {
    xsmall: "h-1.5 w-1.5",
    small: "h-2 w-2",
    medium: "h-2.5 w-2.5",
    large: "h-3 w-3",
    xlarge: "h-4 w-4",
    xxlarge: "h-5 w-5",
  };

  const statusColorClasses = {
    online: "bg-success-500",
    offline: "bg-gray-400",
    busy: "bg-error-500",
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
        <img
          src={src || "/images/user/owner.jpg"}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900 ${statusColorClasses[status]} ${statusSizeClasses[size]}`}
        ></span>
      )}
    </div>
  );
};

export default Avatar;
