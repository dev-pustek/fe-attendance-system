import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { MoreDotIcon } from "../atoms/Icons";
import Dropdown from "./Dropdown";

export const TableActionMenu = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                right: window.innerWidth - rect.right - window.scrollX
            });
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                onClick={toggleMenu}
                className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
            >
                <MoreDotIcon className="size-5" />
            </button>
            
            {isOpen && createPortal(
                <div 
                    className="fixed z-[9999]" 
                    style={{ top: `${coords.top + 4}px`, right: `${coords.right}px` }}
                >
                    <Dropdown
                        isOpen={isOpen}
                        onClose={() => setIsOpen(false)}
                        className="w-36 origin-top-right rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-white/[0.07] dark:bg-gray-900"
                    >
                        {React.Children.map(children, child => {
                            if (React.isValidElement(child)) {
                                return React.cloneElement(child, {
                                    onClick: (e: any) => {
                                        setIsOpen(false);
                                        if (child.props.onClick) child.props.onClick(e);
                                    }
                                } as any);
                            }
                            return child;
                        })}
                    </Dropdown>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TableActionMenu;
