import React from "react";
import { TableRow, TableCell } from "../atoms/Table";

interface SkeletonRowProps {
  cols: number;
  hasCheckbox?: boolean;
}

const SkeletonCell: React.FC<{ wide?: boolean }> = ({ wide }) => (
  <div
    className={`h-4 rounded-md bg-gray-200 dark:bg-white/[0.06] animate-pulse ${wide ? "w-3/4" : "w-1/2"}`}
  />
);

const SkeletonRow: React.FC<SkeletonRowProps> = ({ cols, hasCheckbox = false }) => {
  return (
    <TableRow className="animate-pulse">
      {hasCheckbox && (
        <TableCell className="w-10 px-4 py-4">
          <div className="size-4 rounded bg-gray-200 dark:bg-white/[0.06]" />
        </TableCell>
      )}
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i} className="px-4 py-4">
          <SkeletonCell wide={i === 1} />
        </TableCell>
      ))}
    </TableRow>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; cols: number; hasCheckbox?: boolean }> = ({
  rows = 5,
  cols,
  hasCheckbox = false,
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonRow key={i} cols={cols} hasCheckbox={hasCheckbox} />
    ))}
  </>
);

export default SkeletonRow;
