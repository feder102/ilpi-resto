import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Current page number (1-indexed)
   */
  currentPage: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void;

  /**
   * Number of page buttons to show on each side of current page
   * @default 2
   */
  siblingCount?: number;

  /**
   * Show previous/next buttons
   * @default true
   */
  showArrows?: boolean;

  /**
   * Show first/last page buttons
   * @default false
   */
  showEdges?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * Reusable Pagination Component
 * Pagination controls for navigating large datasets
 *
 * @example
 * <Pagination
 *   currentPage={page}
 *   totalPages={10}
 *   onPageChange={setPage}
 *   siblingCount={2}
 *   showArrows={true}
 * />
 */
const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      currentPage,
      totalPages,
      onPageChange,
      siblingCount = 2,
      showArrows = true,
      showEdges = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    // Calculate page numbers to display
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const leftSibling = Math.max(currentPage - siblingCount, 1);
      const rightSibling = Math.min(currentPage + siblingCount, totalPages);

      // Add first page
      if (leftSibling > 1) {
        pages.push(1);
      }

      // Add ellipsis after first page if needed
      if (leftSibling > 2) {
        pages.push('...');
      }

      // Add range of pages
      for (let i = leftSibling; i <= rightSibling; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (rightSibling < totalPages - 1) {
        pages.push('...');
      }

      // Add last page
      if (rightSibling < totalPages) {
        pages.push(totalPages);
      }

      return pages;
    };

    const pages = getPageNumbers();

    const handlePageClick = (page: number | string) => {
      if (typeof page === 'number' && page !== currentPage && !disabled) {
        onPageChange(page);
      }
    };

    return (
      <div
        ref={ref}
        className={`flex items-center justify-center gap-1 ${className || ''}`}
        {...props}
      >
        {/* Previous button */}
        {showArrows && (
          <button
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1 || disabled}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* First page button */}
        {showEdges && (
          <button
            onClick={() => handlePageClick(1)}
            disabled={currentPage === 1 || disabled}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            1
          </button>
        )}

        {/* Page numbers */}
        {pages.map((page) => (
          <button
            key={String(page)}
            onClick={() => handlePageClick(page)}
            disabled={typeof page === 'string' || currentPage === page || disabled}
            className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              currentPage === page
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
            } focus:outline-none focus:ring-2 focus:ring-indigo-600`}
            aria-label={typeof page === 'number' ? `Page ${page}` : undefined}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        {/* Last page button */}
        {showEdges && (
          <button
            onClick={() => handlePageClick(totalPages)}
            disabled={currentPage === totalPages || disabled}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {totalPages}
          </button>
        )}

        {/* Next button */}
        {showArrows && (
          <button
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages || disabled}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-2 py-2 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    );
  }
);

Pagination.displayName = 'Pagination';

export default Pagination;
