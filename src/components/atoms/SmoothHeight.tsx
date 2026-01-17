import React, { useRef, useState, useEffect } from "react";

interface SmoothHeightProps {
  children: React.ReactNode;
  className?: string;
}

export const SmoothHeight: React.FC<SmoothHeightProps> = ({ children, className = "" }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [overflow, setOverflow] = useState<"hidden" | "visible">("hidden");

  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.contentRect.height);
        setOverflow("hidden");
        // Reset overflow to visible after transition duration (300ms)
        const timeoutId = setTimeout(() => {
            setOverflow("visible");
        }, 300);
        return () => clearTimeout(timeoutId);
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      className={`transition-[height] duration-300 ease-in-out ${className}`}
      style={{ height, overflow }}
    >
      <div ref={contentRef} className="h-fit">
        {children}
      </div>
    </div>
  );
};
