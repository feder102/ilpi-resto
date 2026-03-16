import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  children: React.ReactNode;
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableDataCellElement> {
  children: React.ReactNode;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div className="overflow-x-auto rounded-box">
      <table ref={ref} className={`table table-zebra ${className || ''}`} {...props}>
        {children}
      </table>
    </div>
  )
);

Table.displayName = 'Table';

const TableHead = React.forwardRef<HTMLTableHeaderCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => (
    <th ref={ref} className={className || ''} {...props}>
      {children}
    </th>
  )
);

TableHead.displayName = 'TableHead';

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, ...props }, ref) => (
    <tr ref={ref} className={`hover ${className || ''}`} {...props}>
      {children}
    </tr>
  )
);

TableRow.displayName = 'TableRow';

const TableCell = React.forwardRef<HTMLTableDataCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => (
    <td ref={ref} className={className || ''} {...props}>
      {children}
    </td>
  )
);

TableCell.displayName = 'TableCell';

const TableWithSubcomponents = Table as typeof Table & {
  Head: typeof TableHead;
  Row: typeof TableRow;
  Cell: typeof TableCell;
};

TableWithSubcomponents.Head = TableHead;
TableWithSubcomponents.Row = TableRow;
TableWithSubcomponents.Cell = TableCell;

export default TableWithSubcomponents;
