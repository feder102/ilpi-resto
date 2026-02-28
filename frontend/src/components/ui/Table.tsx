import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /**
   * Table content (thead, tbody, tfoot)
   */
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

/**
 * Reusable Table Component
 * Data table with consistent styling, alternating row colors, and proper accessibility
 *
 * @example
 * <Table>
 *   <thead>
 *     <tr>
 *       <th>Name</th>
 *       <th>Email</th>
 *     </tr>
 *   </thead>
 *   <tbody>
 *     <tr>
 *       <td>John Doe</td>
 *       <td>john@example.com</td>
 *     </tr>
 *   </tbody>
 * </Table>
 */
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200">
      <table
        ref={ref}
        className={`w-full text-sm text-slate-700 ${className || ''}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);

Table.displayName = 'Table';

const TableHead = React.forwardRef<HTMLTableHeaderCellElement, TableHeadProps>(
  ({ className, children, ...props }, ref) => (
    <th
      ref={ref}
      className={`bg-slate-50 px-4 py-3 text-left font-bold text-slate-900 border-b border-slate-200 ${className || ''}`}
      {...props}
    >
      {children}
    </th>
  )
);

TableHead.displayName = 'TableHead';

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={`border-b border-slate-200 hover:bg-slate-50 transition-colors even:bg-slate-50 ${className || ''}`}
      {...props}
    >
      {children}
    </tr>
  )
);

TableRow.displayName = 'TableRow';

const TableCell = React.forwardRef<HTMLTableDataCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => (
    <td
      ref={ref}
      className={`px-4 py-3 ${className || ''}`}
      {...props}
    >
      {children}
    </td>
  )
);

TableCell.displayName = 'TableCell';

// Compound component exports with proper typing
const TableWithSubcomponents = Table as typeof Table & {
  Head: typeof TableHead;
  Row: typeof TableRow;
  Cell: typeof TableCell;
};

TableWithSubcomponents.Head = TableHead;
TableWithSubcomponents.Row = TableRow;
TableWithSubcomponents.Cell = TableCell;

export default TableWithSubcomponents;
