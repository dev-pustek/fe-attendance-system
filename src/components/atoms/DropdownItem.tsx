import React from "react";
import { Link } from "react-router";

interface DropdownItemProps {
  onItemClick?: () => void;
  tag?: "a" | "button";
  to?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  onItemClick,
  tag = "button",
  to,
  href,
  children,
  className = "",
  onClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick(e);
    if (onItemClick) onItemClick();
  };

  if (tag === "a" && to) {
    return (
      <Link to={to} className={className} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  if (tag === "a" && href) {
    return (
      <a href={href} className={className} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <button className={className} onClick={handleClick}>
      {children}
    </button>
  );
};

export default DropdownItem;
