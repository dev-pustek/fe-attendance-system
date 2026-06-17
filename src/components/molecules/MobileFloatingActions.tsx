import React from "react";
import { PlusIcon } from "../atoms/Icons";
import DataActionsMenu from "./DataActionsMenu";

interface MobileFloatingActionsProps {
  onAdd?: () => void;
  addIcon?: React.ReactNode;
  addAriaLabel?: string;
  dataActionsProps?: any; // Omit<DataActionsMenuProps, "isMobileFab">
  className?: string;
  customActions?: React.ReactNode;
}

const MobileFloatingActions: React.FC<MobileFloatingActionsProps> = ({
  onAdd,
  addIcon,
  addAriaLabel = "Add New",
  dataActionsProps,
  className = "",
  customActions,
}) => {
  return (
    <div className={`fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 flex flex-col gap-3 items-end ${className}`}>
      {dataActionsProps && (
        <DataActionsMenu isMobileFab={true} {...dataActionsProps} />
      )}
      {customActions}
      {onAdd && (
        <button
          onClick={onAdd}
          aria-label={addAriaLabel}
          className="flex size-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-brand-500/30 transition-transform active:scale-95"
        >
          {addIcon || <PlusIcon className="size-6 fill-white" />}
        </button>
      )}
    </div>
  );
};

export default MobileFloatingActions;
