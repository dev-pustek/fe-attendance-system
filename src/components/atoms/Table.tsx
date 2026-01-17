import React from "react";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({
  children,
  className = "",
  ...props
}) => (
  <table {...props} className={`min-w-full border-collapse ${className}`}>{children}</table>
);

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  className = "",
  ...props
}) => <thead {...props} className={className}>{children}</thead>;

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody: React.FC<TableBodyProps> = ({
  children,
  className = "",
  ...props
}) => <tbody {...props} className={className}>{children}</tbody>;

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  className = "",
  ...props
}) => <tr {...props} className={className}>{children}</tr>;

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  isHeader?: boolean;
}

export const TableCell: React.FC<TableCellProps> = ({ 
  children, 
  className = "", 
  isHeader = false,
  ...props 
}) => {
  const Component = isHeader ? "th" : "td";
  // We need to cast as any because th and td share most props but TS can be strict
  return <Component {...(props as any)} className={className}>{children}</Component>;
};
